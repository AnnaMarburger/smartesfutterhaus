/* Server */

const fs = require('fs');
const express = require('express');
const app = express();
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
//app.use(express.json());
//app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
 

//handle GET
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


//handle POST
app.post('/', upload.single("img"), (req, res) => {
    
    const img = req.file;
    const weight = req.body.weight;
    const date = new Date().toString()

    var datajson;

    //TODO check if image an actual image


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
    

});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});