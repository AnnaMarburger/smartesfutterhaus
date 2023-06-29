/* Server */
import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, uploadString, getBytes, getBlob, deleteObject } from "firebase/storage";

import fs from 'fs';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';



/*------------------------------------------Config & Init-----------------------------------------------------*/


const app = express();
const PORT = process.env.PORT || 3030;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//firebase config for storing images
const firebaseConfig = {
  apiKey: "AIzaSyC15L-sMTT9bQWNFh0u2Slh0LhDFCEDTpE",
  authDomain: "smartesfutterhaus.firebaseapp.com",
  projectId: "smartesfutterhaus",
  storageBucket: "smartesfutterhaus.appspot.com",
  messagingSenderId: "64678141794",
  appId: "1:64678141794:web:499e0c75cd2a6a3181963b"
};
const fbapp = initializeApp(firebaseConfig);
const fbstorage = getStorage(fbapp);


//multer config for handling incoming images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
const upload = multer({ storage: storage });


//Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));



 
/*------------------------------------------Hilfsfunktionen---------------------------------------------------*/


/*
    delete an image completely (local and firebase) by name (not path!)
    @return: true if succesfull, false if error
*/
function deleteImg(name){

  //delete from local files
  fs.unlink("./public/uploads/"+name, (err) => {
    console.log("error occured while deleting: " + err);
    return false;
  });

  //delete meta data from image entry in data.json
  var json = fs.readFileSync('./public/data.json', 'utf8');
  var datajson = JSON.parse(json);
  var data = datajson.data.filter((obj)=>{return obj.img !== name});
  datajson.data = data;
  fs.writeFileSync("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
      if (error) {
        console.log('An error while deleting from data.json has occurred ', error);
        return false;
      }
  });
  uploadJSONtoFB();
  console.log('Data deleted successfully from data.json');
  
  //delete img from firebase storage
  return deleteObject(ref(fbstorage, "/images/"+name));

}

/*
    download data.json from firebase and save it to files
    @return: true if succesfull, false if error
*/
function downloadJSONfromFB(){
  getBytes(ref(fbstorage, "data.json"))
  .then((res)=>{
    fs.writeFileSync(__dirname+"/public/data.json", Buffer.from(res), (data,err)=>{
      if(err) {
        console.log("error while saving data.json: "+err);
        return false;
      }
    });
  }).catch((error) => {
    console.log("error while downloading data.json: "+error);
    return false;
  });

  return true;
}

/*
    download data.json and all images from firebase and save them to files
    @return: true if succesfull, false if error
*/
function downloadAllfromFB(){

  console.log("downloading: ");

  //download data.json file
  var jsonsuccess = downloadJSONfromFB()

  //download images
  const imgListRef = ref(fbstorage, "/images");
  listAll(imgListRef)
    .then((res) => {
      res.items.forEach((itemRef) => {
        getBytes(itemRef).then((res) => {
          fs.writeFile(__dirname+"/public/uploads/"+itemRef.name, Buffer.from(res), (data,err)=>{
            if(err) {
              console.log("error while saving "+itemRef.name + ": "+err);
              return false;
            }
          });
        });
      });
    }).catch((error) => {
      console.log("error while listing things from firebase: "+error);
      return false;
    });
  
  //download done
  console.log("done");
  return jsonsuccess;

}

/*
    upload data.json to firebase storage
*/
function uploadJSONtoFB(){
  const fbDataRef = ref(fbstorage, "data.json");
  const jsonfile = fs.readFileSync(path.join(__dirname, "/public/data.json"));
  uploadString(fbDataRef, jsonfile.toString("base64"), 'base64')
    .then(() => {
      console.log("JSON uploaded to firebase");
    }).catch((error) => {
      console.log(error);
    });
}




/*----------------------------------------Handle-Requests-Funtionen-------------------------------------------*/


//handle GET
app.get('*', (req, resToClient) => {
  
   //check if data has to be downloaded
  var json = fs.readFileSync('./public/data.json', 'utf8');
  var datajson = JSON.parse(json);
  var data = datajson.data;
  var success;
  if(data.length < 1){
    success = downloadAllfromFB();
  } else {success = true;}

  //send back html to client
  if(success){
    resToClient.sendFile(__dirname + '/index.html');
  } else {
    resToClient.status(503).send("Internalserver error while downloading");
  }
});


//handle DELETE
app.delete('*', (req, res) => {

  //get request vars
  const imgname = req.body.name;
  const password = req.body.password;
  const type = req.body.type;

  //check if request correct
  if(password != "SWH2023"){
    res.status(403).send(`You need the right password to send a delete request to this server.${password
    } is incorrect.`);
  } else if((imgname == "" || imgname == null) && type=="single"){
    res.status(403).send("Your DELETE request didn't contain a name field");
  } else if(type == "single"){

    //delete from local and firebase and update data.json accordingly everywhere
    deleteImg(imgname);

    //answer client if deletion was succesful
    if(deleteImg()){
      res.status(200).send(`You successfully deleted the file: ${imgname}`);
    } else {
      res.status(500).send(`An error occured while deleting the file: ${imgname}. Try again.`);
    }


  } else if (type == "all"){

    //delete all data from data.json and update FB
    var json = fs.readFileSync('./public/data.json', 'utf8');
    var datajson = JSON.parse(json);
    datajson.data.forEach(obj => {deleteImg(obj.img);});
    datajson.data = [];
    fs.writeFileSync("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
        if (error) {
          console.log('An error while writing data.json has occurred ', error);
          return;
        }
    });
    uploadJSONtoFB();
    console.log('Data deleted successfully from data.json');
    
    //delete all imgages from firebase storage
    listAll(ref(fbstorage, "/images"))
      .then((res) => {
        res.items.forEach((itemRef) => {
          deleteObject(itemRef);
        })
      }).catch((error) => {
        console.log("error while deleting img from firebase: "+error);
        res.status(500).send(`An error occured while deleting the file: ${imgname}. Try again.`);
        return;
      });

    res.status(200).send(`You successfully deleted all data`);
  }

});


//handle POST
app.post('/', upload.single("img"), (req, res) => {

    console.log('received post request: '+req.toString());
    
    //get img data
    const img = req.file;
    const weight = req.body.weight;
    const password = req.body.password;
    const date = new Date().toString()
    const newname = "espcam_"+date.toLocaleLowerCase().replace(' ', '_')+".jpg";
    console.log(newname);

    //check if request ok
    if(password != "SWH2023"){
      res.status(407).send("You need the right password to post to this server");
      deleteImg(img.originalname);
    } else if(img.size > 500000){
      res.status(415).send(`The image send was too big: ${img.size}`);
      deleteImg(img.originalname);
    } else if(weight == null || weight == "" || isNaN(parseFloat(weight.replace(",", ".")))){
      res.status(400).send("Your POST request didn't contain a proper weight field");
      deleteImg(img.originalname);
    } else {
      var datajson;

      //download current json file from database
      if(downloadJSONfromFB()){
    
        //safe meta data of image to json file
        var json = fs.readFileSync('./public/data.json', 'utf8');
        var datajson = JSON.parse(json);
        datajson.data.push({"img": newname, "weight": weight, "date": date});
        fs.writeFileSync("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
            if (error) {
              console.log('An error while writing data.json has occurred ', error);
              return;
            }
            console.log('Data written successfully to data.json');

            //upload data.json to firebase storage
            uploadJSONtoFB();
        });

        //upload img to firebase storage
        const fbstorageImgRef = ref(fbstorage, "/images/"+newname);
        const relPath= "/public/uploads/"+img.originalname;
        const Imgfile = fs.readFileSync(path.join(__dirname, relPath));
        uploadString(fbstorageImgRef, Imgfile.toString("base64"), 'base64'); 
        
        //send ok response
        res.sendStatus(200);
      } else {
        //an error occured, send error response
        res.status(500).send(`An error occured while uploading the file: ${newname}. Try again.`);
      }

    }

});


//start server and listenn
app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});