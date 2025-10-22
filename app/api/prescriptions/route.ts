import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../../../lib/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || !body.prescriptionId || !body.pdfBase64) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const projectRoot = process.cwd();
    const prescriptionsDir = path.join(projectRoot, 'Dataset', 'prescriptions');

    // Ensure directory exists
    if (!fs.existsSync(prescriptionsDir)) {
      fs.mkdirSync(prescriptionsDir, { recursive: true });
    }

    // Save PDF locally
    const pdfFilename = `prescription_${body.prescriptionId}.pdf`;
    const pdfPath = path.join(prescriptionsDir, pdfFilename);
    const pdfBuffer = Buffer.from(body.pdfBase64, 'base64');
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Upload to Firebase Storage
    const storageRef = ref(storage, `prescriptions/${pdfFilename}`);
    const snapshot = await uploadBytes(storageRef, pdfBuffer);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'prescriptions'), {
      prescriptionId: body.prescriptionId,
      patientId: body.patientId,
      patientName: body.patientName,
      age: body.age,
      gender: body.gender,
      diagnosis: body.diagnosis,
      medicines: body.medicines,
      tests: body.tests,
      advice: body.advice,
      doctorName: body.doctorName,
      createdAt: new Date(body.createdAt),
      printedAt: new Date(body.printedAt),
      pdfUrl: downloadURL,
      status: 'active',
      localPath: pdfPath
    });

    // Append to CSV
    const csvPath = path.join(prescriptionsDir, 'prescriptions.csv');
    const headers = [
      'prescriptionId',
      'patientId',
      'patientName',
      'age',
      'gender',
      'diagnosis',
      'medicines',
      'tests',
      'advice',
      'doctorName',
      'createdAt',
      'printedAt',
      'historyFile',
      'status',
      'pdfPath',
      'firestoreId'
    ];

    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, headers.join(',') + '\n');
    }

    const row = [
      body.prescriptionId,
      body.patientId || '',
      body.patientName || '',
      body.age || '',
      body.gender || '',
      body.diagnosis || '',
      body.medicines || '',
      body.tests || '',
      body.advice || '',
      body.doctorName || '',
      body.createdAt || new Date().toISOString(),
      body.printedAt || new Date().toISOString(),
      body.historyFile || '',
      body.status || 'active',
      pdfPath,
      docRef.id
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

    fs.appendFileSync(csvPath, row + '\n');

    return NextResponse.json({
      success: true,
      pdfFilename,
      firestoreId: docRef.id,
      downloadURL
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500 }
    );
  }
}