// set TF_CPP_MIN_LOG_LEVEL=2

import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet } from './commons';

import * as WebSocket from 'ws';
import * as uuid from "uuid";

//import * as os from "os";
const os = require('os');

// os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

const wss = new WebSocket.Server({ port: 8080 });


class FaceCompare {
  minConfidence: number;
  weights_path: string;
  fDetectionOptions: any;
  IsWeightLoaded: boolean;

  constructor(weights_path: string, minConfidence = 0.45) {
    this.weights_path = weights_path;
    this.minConfidence = minConfidence;
    this.IsWeightLoaded = false;
    this.fDetectionOptions = new faceapi.SsdMobilenetv1Options(
      { minConfidence: minConfidence });
  }

  async Compare(rImg: string, qImg: string, CustomConfidenceThreshold = 0.45) {
    let rc = { match: false, eDistance: 0 };

    if (this.IsWeightLoaded == false) {
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
      // sat
      console.log(`bestMatch = ${bestMatch}`);
      // console.log( resultsQuery[0]);
      // console.log( resultsQuery[0].descriptor);
      // Object.keys(resultsQuery[0].descriptor).forEach((prop)=> console.log(prop));


      // console.log( "resultsRef = " );
      // console.log(JSON.stringify( resultsRef[0].descriptor, null, 4));

      // console.log( "resultsQuery = " );
      // console.log(JSON.stringify( resultsQuery[0].descriptor, null, 4));

      if (bestMatch.distance <= CustomConfidenceThreshold) {
        rc.match = true;
      }
      MyEuclideanDistance(resultsRef[0].descriptor, resultsQuery[0].descriptor);
      rc.eDistance = bestMatch.distance * 100;
    }
    return (rc);
  }

  ////////////

  async GetImgLandmarks(rImg: string) {
    let rc = { landmarks: "" };

    if (this.IsWeightLoaded == false) {
      await faceDetectionNet.loadFromDisk(this.weights_path);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.weights_path);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.weights_path);
      this.IsWeightLoaded = true;
    }
    const referenceImage = await canvas.loadImage(rImg)
    const resultsRef = await faceapi.detectAllFaces(referenceImage, this.fDetectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (resultsRef.length === 1) {
      rc.landmarks = resultsRef[0].descriptor.join(', ');
    } else {
      console.log(`incorrect number of objects: resultsRef.length=${resultsRef.length}`);
    }

    return (rc);
  }

}



function MyEuclideanDistance(v1: Float32Array, v2: Float32Array) {
  let s = 0.0;
  for (let i = 0; i < v1.length; ++i) {
    s += Math.pow(v1[i] - v2[i], 2);
  }
  let eqd = Math.sqrt(s);

  console.log(`MyEuclideanDistance = ${eqd}`);
  // MyEuclideanDistance = 0.2197259894762486
}


//////////////////////////////////////////////
wss.on('connection', (ws: any) => {
  // ws has to of type any to assign a new element
  ws['id'] = uuid.v4();
  const wt_path = path.join(__dirname, '../../weights');
  const TestImgPath1 = path.join(__dirname, "../images/test1/")
  let faceCompare = new FaceCompare(wt_path);

  // The incoming message
  ws.on('message', async function incoming(message: any) {
    let req: any;
    let action = "";
    let id = 0;

    var message_text = message.toString('utf8');
    // console.log( "typeof(message) : " + typeof(message));
    // console.log( "typeof(message_text) : " + typeof(message_text));


    try {
      req = JSON.parse(message);
      action = req.action;
      id = req.id;
      console.log(`action : ${action}, id = ${id} `);
    }
    catch (error) {
      console.log(message_text);
      // const buff = fs.writeFileSync( './0.out.js', message_text);
      console.log("JSON.parse Error: message in param");
      console.log("message.len = " + message_text.length);
    }

    let res = undefined;
    if (action == 'Compare1') {
      let rc = await faceCompare.Compare(
        TestImgPath1 + req.img1,
        TestImgPath1 + req.img2);
      res = {
        xid: 2001,
        id: id,
        action: action,
        match: rc.match,
        eDistance: rc.eDistance
      };
    }
    else if (action == 'Compare2') {
      let rc = await faceCompare.Compare(req.img1, req.img2);

      res = {
        xid: 2001,
        id: id,
        action: action,
        match: rc.match,
        eDistance: rc.eDistance
      };

    } else if (action === 'GetImgLandmarks' || action === 'GetImgLandmarksTest' ) {
      let img = req.img1;

      if (action === 'GetImgLandmarksTest'){
        img = TestImgPath1 + req.img1;
        console.log('GetImgLandmarksTest: ' + img);
      }
      let rc = await faceCompare.GetImgLandmarks(img);
      res = rc.landmarks;

    } else {
      console.log(req);
      console.log('action :' + action);
      console.log('message len :' + message.length);
      res = { xid: 3, id: id, action: "unknown request" };
    }


    ////// Process res for sending
    if (action === 'GetImgLandmarks' || action === 'GetImgLandmarksTest' ) {
      // res has already set 
      // console.log('ReturnResult=' + res);
    }
    else {
      res = JSON.stringify(res);
    }

    console.log('res len =' + res.length);
    ws.send(res);

  });

  ws.send(JSON.stringify({ xid: 1, id: ws.id, action: "connection", msg: "Success" }));

});

