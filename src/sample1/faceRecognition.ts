import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet, faceDetectionOptions, saveFile } from './commons';

let REFERENCE_IMAGE = path.join( __dirname, '../images/bbt1.jpg' )
let QUERY_IMAGE = path.join( __dirname, '../images/bbt4.jpg' );

// const img_test = "C:/x-test-img/t1/";
// REFERENCE_IMAGE = img_test + "r1.jpg";
// QUERY_IMAGE  = img_test + "q2.jpg";


async function run() {

  const weights_path = path.join( __dirname, '../../weights' );

  // await faceDetectionNet.loadFromDisk('../../weights')
  await faceDetectionNet.loadFromDisk( weights_path );
  await faceapi.nets.faceLandmark68Net.loadFromDisk( weights_path )
  await faceapi.nets.faceRecognitionNet.loadFromDisk( weights_path )

  const referenceImage = await canvas.loadImage(REFERENCE_IMAGE)
  const queryImage = await canvas.loadImage(QUERY_IMAGE)

  const resultsRef = await faceapi.detectAllFaces(referenceImage, faceDetectionOptions)
    .withFaceLandmarks()
    .withFaceDescriptors()

  const resultsQuery = await faceapi.detectAllFaces(queryImage, faceDetectionOptions)
    .withFaceLandmarks()
    .withFaceDescriptors()

  console.log( `resultsRef ${resultsRef}`);
  console.log();
  const s = JSON.stringify( resultsRef );
  console.log( `resultsRef String ${s}`);
  console.log();


  const faceMatcher = new faceapi.FaceMatcher(resultsRef)

  const labels = faceMatcher.labeledDescriptors
    .map(ld => ld.label)
  const refDrawBoxes = resultsRef
    .map(res => res.detection.box)
    .map((box, i) => new faceapi.draw.DrawBox(box, { label: labels[i] }))
  const outRef = faceapi.createCanvasFromMedia(referenceImage)
  refDrawBoxes.forEach(drawBox => drawBox.draw(outRef))

  saveFile('referenceImage.jpg', (outRef as any).toBuffer('image/jpeg'))

  let pcount = 0;

  const queryDrawBoxes = resultsQuery.map(res => {
    const bestMatch = faceMatcher.findBestMatch(res.descriptor)

    // const s = JSON.stringify( res.descriptor );
    //console.log( `res.descriptor String ${s}`);
    console.log();

    // console.log( `res ${res}` )
    console.log( `bestMatch ${bestMatch}` )
    ++pcount;

    return new faceapi.draw.DrawBox(res.detection.box, { label: bestMatch.toString() })
  })



  const outQuery = faceapi.createCanvasFromMedia(queryImage)
  queryDrawBoxes.forEach(drawBox => drawBox.draw(outQuery))
  saveFile('queryImage.jpg', (outQuery as any).toBuffer('image/jpeg'))
  console.log('done, saved results to out/queryImage.jpg')
  console.log( `pcount ${pcount}`);
}

run()