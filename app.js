/* Server */
import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, uploadString, getBytes, getBlob, deleteObject } from "firebase/storage";

import fs from 'fs';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3030;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//firebase for storing images
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


//multer for saving incoming images
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
 
//delete an image by name (not path!)
function deleteimgfromfiles(name){
  const path = "./public/uploads/"+name;
  fs.unlink(path, (err) => {
    console.log("error occured while deleting: " + err);
  });

  //delete from firebase storage
  //TODO do

}

//handle GET
app.get('*', (req, res) => {
    //download images from storage
    const imgListRef = ref(fbstorage, "/images");
    listAll(imgListRef)
      .then((res) => {
        res.items.forEach((itemRef) => {
          getBytes(itemRef).then((res) => {
            fs.writeFile(__dirname+"/public/uploads/"+itemRef.name, Buffer.from(res), (data,err)=>{
              if(err) console.log("error while saving "+itemRef.name + ": "+err);

              //download data.json file
              getBytes(ref(fbstorage, "data.json")).then((res)=>{
                fs.writeFile(__dirname+"/public/data.json", Buffer.from(res), (data,err)=>{
                  if(err) console.log("error while saving data.json: "+err);
        
                  //send back html to client
                  res.sendFile(__dirname + '/index.html');
                });
              })
              
            });
          });
        })
      }).catch((error) => {
        console.log("error while listing things from firebase: "+error);
      });

      

   
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
    deleteimgfromfiles(imgname);

    //delete meta data from image entry in data.json
    fs.readFile('./public/data.json', 'utf8', (error, json) => {
      if(error){
          console.log(error);
          return;
      }
      var datajson = JSON.parse(json);
      var data = datajson.data.filter((obj)=>{return obj.img !== imgname});
      datajson.data = data;
      fs.writeFile("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
          if (error) {
            console.log('An error while deleting from data.json has occurred ', error);
            return;
          }
          uploadJSONtoFB();
          console.log('Data deleted successfully from data.json');
      });
    })

    //delete img from firebase storage
    deleteObject(ref(fbstorage, "/images/"+imgname));

    res.status(200).send(`You successfully deleted the file: ${imgname}`);

  } else if (type == "all"){

    //delete all data from data.json
    fs.readFile('./public/data.json', 'utf8', (error, json) => {
      if(error){
          console.log(error);
          return;
      }
      var datajson = JSON.parse(json);
      datajson.data.forEach(obj => {
        deleteimgfromfiles(obj.img);
      });
      datajson.data = [];
      fs.writeFile("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
          if (error) {
            console.log('An error while writing data.json has occurred ', error);
            return;
          }
          uploadJSONtoFB();
          console.log('Data deleted successfully from data.json');
      });
    })
    
    //delete all imgages from firebase storage
    listAll(ref(fbstorage, "/images"))
      .then((res) => {
        res.items.forEach((itemRef) => {
          deleteObject(itemRef);
        })
      }).catch((error) => {
        console.log("error while deleting img from firebase: "+error);
      });

    res.status(200).send(`You successfully deleted all data`);
  }

});



//handle POST
app.post('/', upload.single("img"), (req, res) => {

    console.log('received post request: '+req.toString());
    
    const img = req.file;
    const weight = req.body.weight;
    const password = req.body.password;
    const date = new Date().toString()
    const newname = "espcam_"+date.replace(" ", "_")+".jpg";
    console.log(newname);

    if(password != "SWH2023"){
      res.status(403).send("You need the right password to post to this server");
      deleteimgfromfiles(img.originalname);
    } else if(img.size > 500000){
      res.status(403).send(`The image send was too big: ${img.size}`);
      deleteimgfromfiles(img.originalname);
    } else if(weight == null || weight == "" || isNaN(parseFloat(weight.replace(",", ".")))){
      res.status(403).send("Your POST request didn't contain a weight field");
      deleteimgfromfiles(img.originalname);
    } else {
      var datajson;

      //safe meta data of image to json file
      fs.readFile('./public/data.json', 'utf8', (error, json) => {
          if(error){
              console.log(error);
              return;
          }
  
          datajson = JSON.parse(json);
          datajson.data.push({"img": newname, "weight": weight, "date": date});
          fs.writeFile("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
              if (error) {
                console.log('An error while writing data.json has occurred ', error);
                return;
              }
              console.log('Data written successfully to data.json');

              //upload data.json to firebase storage
              uploadJSONtoFB();
          });
      })

      //upload img to firebase storage
      const fbstorageImgRef = ref(fbstorage, "/images/"+newname);
      const relPath= "/public/uploads/"+img.originalname;
      const Imgfile = fs.readFileSync(path.join(__dirname, relPath));
      uploadString(fbstorageImgRef, Imgfile.toString("base64"), 'base64')
        .then((snapshot) => {
          console.log('Uploaded file to firebase storage');
        });   

      res.sendStatus(200);
    }

});

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


app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});