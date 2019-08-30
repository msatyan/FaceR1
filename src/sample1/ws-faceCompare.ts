// set TF_CPP_MIN_LOG_LEVEL=2

import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet } from './commons';

// import * as express from 'express';
// import * as http from 'http';
import * as WebSocket from 'ws';
import * as uuid from "uuid";

const wss = new WebSocket.Server({ port: 8080 });


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

  //let rc = await faceCompare.Compare( ImgStr1, ImgStr2, 0.5 );
  // console.log( "JustinTrudeau Img: " + JSON.stringify(rc) );
  console.log( "Done !!!" );
}

// test1();

//wss.on('connection', (ws: WebSocket) => {
wss.on('connection', (ws: any) => {
  // ws has to of type any to assign a new element
  ws['id'] = uuid.v4();
  const wt_path = path.join(__dirname, '../../weights');
  const TestImgPath1 = path.join(__dirname, "../images/test1/" )
  let faceCompare = new FaceCompare( wt_path );

  // The incoming message
  ws.on('message', async function incoming(message: string) {
    let msg_in = JSON.parse( message);
    console.log( `id=${msg_in.id} and msg=${msg_in.msg}`)

    let acn = {
      msg: "acknowledge ",
      acnid: ws.id,
      msgid: msg_in.id,
      res: 'well done'
    };

    let isML = true;
    if( isML ) {
      let rc = await faceCompare.Compare( TestImgPath1 + "t1/JustinTrudeau-1.jpg", TestImgPath1 + "t1/JustinTrudeau-3.jpg" );
      const s = JSON.stringify(rc);
      console.log( "JustinTrudeau: " + s );
      ws.send( s );
    } else {
      ws.send( JSON.stringify(acn) ); // Send an acknowledgement
    }
  });

  ws.send('Connection Success Message From Server to Client ' + ws.id );

});

