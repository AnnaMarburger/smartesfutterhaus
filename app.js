/* Server */

const fs = require('fs');
const express = require('express');
const app = express();

//multer for saving incoming images
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 3030;


//Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
 
//delete an image by name (not path!)
function deleteimgfromfiles(name){
  const path = "./public/uploads/"+name;
  fs.unlink(path, (err) => {
    console.log(err);
  });
}

//handle GET
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


//handle DELETE
app.delete('*', (req, res) => {
  const imgname = req.body.name;
  const password = req.body.password;
  const type = req.body.type;

  if(password != "SWH2023"){
    res.status(403).send(`You need the right password to send a delete request to this server.${password
    } is incorrect.`);
  } else if(imgname == "" || imgname == null){
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
      console.log("before filtering: " +datajson.data);
      var data = datajson.data.filter((obj)=>{return obj.img !== imgname});
      datajson.data = data;
      console.log("after filtering: "+datajson.data);
      fs.writeFile("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
          if (error) {
            console.log('An error while deleting from data.json has occurred ', error);
            return;
          }
          console.log('Data deleted successfully from data.json');
      });
    })

    res.status(200).send(`You successfully deleted the file: ${imgname}`);

  } else if (type == "all"){
    //delete all pics and data
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
          console.log('Data deleted successfully from data.json');
      });
    })

    res.status(200).send(`You successfully deleted all data`);
  }

});


//handle POST
app.post('/', upload.single("img"), (req, res) => {

    console.log('received post request.');
    
    const img = req.file;
    const weight = req.body.weight;
    const password = req.body.password;
    const date = new Date().toString()

    if(password != "SWH2023"){
      res.status(403).send("You need the right password to post to this server.");
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
          datajson.data.push({"img": img.originalname, "weight": weight, "date": date});
          fs.writeFile("./public/data.json", JSON.stringify(datajson, null, 2), (error) => {
              if (error) {
                console.log('An error while writing data.json has occurred ', error);
                return;
              }
              console.log('Data written successfully to data.json');
          });
      })
      
      res.sendStatus(200);
    }

});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});