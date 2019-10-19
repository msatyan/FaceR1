// set TF_CPP_MIN_LOG_LEVEL=2

import * as faceapi from 'face-api.js';
import * as path from 'path';

import { canvas, faceDetectionNet } from './commons';

import * as express from "express";
import * as bodyParser from "body-parser";
import * as http from 'http';
const port = process.env.PORT || 3000;



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
      // console.log(`bestMatch ${bestMatch}`);
      if (bestMatch.distance <= CustomConfidenceThreshold) {
        rc.match = true;
      }
      rc.eDistance = bestMatch.distance * 100;
    }
    return (rc);
  }
}


//////////////////////////////////////////////////////////

class App {
    public app: express.Application = express();
    faceCompare: FaceCompare;
    TestImgPath1: string;

    constructor() {

        const wt_path = path.join(__dirname, '../../weights');
        this.TestImgPath1 = path.join(__dirname, "../images/test1/")
        this.faceCompare = new FaceCompare(wt_path);

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({
          extended: false
        }));

        this.MyRouts();
    }

    private MyRouts(): void {

        this.app.post("/v1/fc1", async  (req:any, res:any) => {
            console.log( req.body );
            const rc = await this.faceCompare.Compare(
                this.TestImgPath1 + req.body.img1,
                this.TestImgPath1 + req.body.img2 );
            res.send( rc );
          });

          this.app.post("/v1/fc2", async  (req:any, res:any) => {
            console.log( req.body );
            const rc = await this.faceCompare.Compare( req.body.img1, req.body.img2 );
            console.log( rc );
            res.send( rc );
          });


        // Wiring up error handler middleware, this must be after the routes
        // catch 404 and forward to error handler
        this.app.use((req:any, res:any, next:any) => {
            // var err: any;
            // err = new Error('Not Found');
            const err: { status?: number, message:string } = new Error('Not Found');
            err.status = 404;
            next(err);
          });


        // error handler
        this.app.use( (err:any, req:any, res:any, next:any) =>  {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            res.status(err.status || 500);
            res.send('You Got Error');
        });

    }
}

// export default new App().app;
console.log(`http://localhost:${port}/v1/fc1`);

//create http server
var server = http.createServer(new App().app);

//listen on provided ports
server.listen(port);



