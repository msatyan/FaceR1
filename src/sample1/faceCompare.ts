import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet } from './commons';


class FaceCompare {
  minConfidence: number;
  weights_path: string;
  fDetectionOptions: any;
  IsWeightLoaded: boolean;

  constructor(weights_path: string, minConfidence = 0.5) {
    this.weights_path = weights_path;
    this.minConfidence = minConfidence;
    this.IsWeightLoaded = false;
    this.fDetectionOptions = new faceapi.SsdMobilenetv1Options(
      { minConfidence: minConfidence });
  }

  async Compare(rImg: string, qImg: string, CustomConfidenceThreshold = 0.45) {
    let rc = { match: false, distance: 100 };

    if ( this.IsWeightLoaded == false )
    {
      await faceDetectionNet.loadFromDisk(this.weights_path);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.weights_path);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.weights_path);
      this.IsWeightLoaded = true;
    }
    const referenceImage = await canvas.loadImage(rImg)
    const queryImage = await canvas.loadImage(qImg)

    const resultsRef = await faceapi.detectAllFaces(referenceImage, this.fDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()

    const resultsQuery = await faceapi.detectAllFaces(queryImage, this.fDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (resultsRef.length === 1 &&
      resultsQuery.length === 1) {
      const faceMatcher = new faceapi.FaceMatcher(resultsRef)
      const bestMatch = faceMatcher.findBestMatch(resultsQuery[0].descriptor)
      // console.log(`bestMatch ${bestMatch}`);
      if (bestMatch.distance <= CustomConfidenceThreshold) {
        rc.match = true;
        rc.distance = bestMatch.distance;
      }
    }
    return (rc);
  }
}


async function test1()
{
  const wt_path = path.join(__dirname, '../../weights');

  const TestImgPath1 = path.join(__dirname, "../images/test1/" )

  let faceCompare = new FaceCompare( wt_path );
  let rc = await faceCompare.Compare( TestImgPath1+"einstein1.jpg", TestImgPath1 + "einstein2.jpg", 0.5 );
  console.log( JSON.stringify(rc) );

  rc = await faceCompare.Compare( TestImgPath1 + "obama1.jpg", TestImgPath1 + "obama2.jpg" );
  console.log( JSON.stringify(rc) );

  rc = await faceCompare.Compare( TestImgPath1 + "stevejobs1.jpg", TestImgPath1 + "stevejobs2.jpg" );
  console.log( JSON.stringify(rc) );

  rc = await faceCompare.Compare( TestImgPath1 + "BillGates1.jpg", TestImgPath1 + "BillGates2.jpg" );
  console.log( JSON.stringify(rc) );

  console.log( "Done !!!" );
}

test1();
