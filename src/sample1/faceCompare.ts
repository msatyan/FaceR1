import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet, saveFile } from './commons';

const weights_path = path.join(__dirname, '../../weights');
let REFERENCE_IMAGE = path.join(__dirname, '../images/bbt1.jpg')
let QUERY_IMAGE = path.join(__dirname, '../images/bbt4.jpg');

const img_test = "C:/x-test-img/t1/";
REFERENCE_IMAGE = img_test + "r1.jpg";
QUERY_IMAGE = img_test + "q3.jpg";


async function CompareImg(rImg: string, qImg: string, CustomConfidenceThreshold = 0.45) {
  let rc = { match: false, distance: 100 };

  const fDetectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })

  await faceDetectionNet.loadFromDisk(weights_path);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(weights_path)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(weights_path)

  const referenceImage = await canvas.loadImage(rImg)
  const queryImage = await canvas.loadImage(qImg)

  const resultsRef = await faceapi.detectAllFaces(referenceImage, fDetectionOptions)
    .withFaceLandmarks()
    .withFaceDescriptors()

  const resultsQuery = await faceapi.detectAllFaces(queryImage, fDetectionOptions)
    .withFaceLandmarks()
    .withFaceDescriptors()

  if (resultsRef.length === 1 &&
    resultsQuery.length === 1) {
    const faceMatcher = new faceapi.FaceMatcher(resultsRef)
    const bestMatch = faceMatcher.findBestMatch(resultsQuery[0].descriptor)
    // console.log(`bestMatch ${bestMatch}`);
    if ( bestMatch.distance <= CustomConfidenceThreshold ) {
      rc.match = true;
      rc.distance = bestMatch.distance;
    }
  }

  return( rc );

}

async function RUN() {
  const rc = await CompareImg(REFERENCE_IMAGE, QUERY_IMAGE);
  console.log(`rc = ` + JSON.stringify(rc) );
}

RUN()
console.log( " Don !!!" );