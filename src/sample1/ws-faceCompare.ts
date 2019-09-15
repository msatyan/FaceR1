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

  constructor(weights_path: string, minConfidence = 0.5) {
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
      // console.log(`bestMatch ${bestMatch}`);
      if (bestMatch.distance <= CustomConfidenceThreshold) {
        rc.match = true;
        rc.eDistance = bestMatch.distance * 100;
      }
    }
    return (rc);
  }
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
    }
    catch (error) {
      console.log( message_text );
      // const buff = fs.writeFileSync( './0.out.js', message_text);
      console.log("JSON.parse Error: message in param" );
      console.log("message.len = " + message_text.length);
    }

    let res = undefined;
    if (action == 'Compare1') {
      let rc = await faceCompare.Compare(
        TestImgPath1 + req.img1,
        TestImgPath1 + req.img2 );
      res = {
        id: id,
        xid:2001,
        action: action,
        match: rc.match,
        eDistance: rc.eDistance
      };
    }
    else if (action == 'Compare2') {
      let rc = await faceCompare.Compare( req.img1, req.img2 );

      res = {
        id: id,
        xid:2001,
        action: action,
        match: rc.match,
        eDistance: rc.eDistance
      };

    }
    else {
      console.log(req);
      console.log('action :' + action);
      console.log('message len :' + message.length);
      res = { id: id, xid:3, action: "unknown request" };
    }
    const s = JSON.stringify(res);
    console.log(s);
    ws.send(s);

  });

  ws.send(JSON.stringify({ id: ws.id, xid:1, action: "connection", msg: "Success" }));

});

