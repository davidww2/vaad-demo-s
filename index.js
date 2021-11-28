const http = require("http");
const https = require("https");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
const path = require("path");
const dir = process.cwd();
const fs = require("fs");
const fsExtra = require("fs-extra");
const request = require("request");
const mongodb = require("mongodb");
const ObjectId = require("mongodb").ObjectID;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM(``, { runScripts: "outside-only" });
const cors = require("cors");
app.use(cors());
var jwt = require("jwt-simple");
var secret = "DavidLevanon";
const mainSrc = "src/assets/";
const birthdayImagesMainSrc = mainSrc + "ימי הולדת/";
const rememberImagesMainSrc = mainSrc + "קצת להיזכר/";
const coursesAmitimImagesMainSrc = mainSrc + "השתלמויות עמיתים/";
const vacationsAbroadImagesMainSrc = mainSrc + "נופשים בחוץ לארץ/";

let db = null;
/* (async () => {
  try {
    const url = process.env.MONGO_URI || "mongodbmongodb://127.0.0.1:27017/";
    await mongodb.connect(url, { useUnifiedTopology: true }, function(
      err,
      data
    ) {
      if (!err) {
        //console.log("We are connected");
        db = data.db("vaad");
        console.log("MongoDB connected");
        collection =db.collection('users');
      } else {
        console.log("error connect mongodb");
      }
    });
  } catch (e) {
    console.log("e-log= ", e);
  }
})(); */

const currentDate = () => {
  let date = new Date();
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()];
};

//MainTopNav
async function getUserFromDB(userName, password) {
  try {
    let user = await db
      .collection('users')
      .find({ userName: userName, password: password })
      .toArray();
    return user[0];
  } catch (e) {
    console.log("getUserFromDB-Error- ", e);
  }
}

async function getUserFromToken(token) {
  //console.log("getUserFromToken -> token", token);
  var decoded = jwt.decode(token, secret);
  //console.log("getUserFromToken -> decoded", decoded);
  let user = await getUserFromDB(decoded.userName, decoded.password);
  //console.log("getUserFromToken -> user", user);
  if (user) {
    return user;
  } else {
    return false;
  }
  /* await db.collection('users').findOne({ userName : req.body.userName,
  password: req.body.password }, (err, result)=> {
  if (err) throw err;
  let user=result;
  if(user){
    var token = jwt.encode(req.body, secret);
    res.status(200).send(JSON.stringify({token: token, id: user._id, name: user.name}));
  }else{
    res.status(200).send({token: false})
  }

return (JSON.stringify({id: user._id, name: user.name})); */
}

app.get("/", async (req, res) => {
  try {
    res.status(200).send('<a href="http://www.google.co.il">Google</a>');
  } catch (g) {
    console.log("/=> ", g);
  }
});

app.post("/getUser", async (req, res) => {
  try {
    //console.log("getUser", req.body.token);

    let user = await getUserFromToken(req.body.token);
    console.log("getUserFromToken -> user", user);
    res.status(200).send(JSON.stringify({ name: user.name }));
  } catch (g) {
    console.log("getUser=> ", g);
  }
});

//LoginManager

const makeToken = user => {
  let token = jwt.encode(user, secret);
  //console.log("makeToken -> token", token);
  return token;
};
app.post("/loginUser", async (req, res) => {
  try {
    /*var decoded = jwt.decode(token, secret);
console.log(decoded);*/
    /* let existsUser = await  db.collection('users').find(  { userName : req.body.userName,
password: req.body.password }  ).count() > 0; */
    let user;
    user = await getUserFromDB(req.body.userName, req.body.password);
    if (user) {
      //console.log("loginUser -> user", user);
      res.json({ token: makeToken(user), id: user._id, name: user.name });
    } else {
      res.status(200).send({ token: false });
    }

    //res.status(200).send( await  db.collection('users').find(  { userName : req.body.userName }  ));
  } catch (f) {
    console.log("Error=>loginUser=> ", f);
  }
});

// Home
const getHomePage = async () => {
  try {
    let dateObject = await currentDate();
    let day = dateObject[0];
    let month = dateObject[1];
    var photosArray = [];
    let pathExists = fs.existsSync(birthdayImagesMainSrc + month + "/" + day);
    if (pathExists) {
      fs.readdirSync(birthdayImagesMainSrc + month + "/" + day).forEach(
        file => {
          let word = file.sub().replace(/<[/]sub>|<sub>|.jpg|.gif|.png/gi, "");
          photosArray.push({
            title: word,
            src: base64_encode(
              birthdayImagesMainSrc + month + "/" + day + "/" + file.substring()
            ),
            /* "birthdayDate/" +
              month +
              "/" +
              day +
              "/" +
              file.substring(), */
            type: replaceImageToType(file),
            id: +photosArray.length
          });
        }
      );
    }
    if (photosArray.length == 0) {
      photosArray.push({
        title: "birthday",
        src: base64_encode("src/assets/birthday.jpg"),
        type: ".jpg",
        id: +photosArray.length
      });
    }
    return photosArray;
  } catch (e) {
    console.log("getHomePage=> ", e);
  }
};

const getFromDB = async (collection, onlyDisable) => {
  try {
    let object;
    if (onlyDisable) {
      object = await db
        .collection(collection)
        .find({ disable: false })
        .toArray();
    } else {
      object = await db
        .collection(collection)
        .find()
        .toArray();
    }
    if (collection == "navNews") {
      if (onlyDisable) {
        object.splice(
          object.findIndex(x => x.maxNumber),
          0
        );
      } else if (!onlyDisable) {
        object.splice(
          object.findIndex(x => x.maxNumber),
          1
        );
      }

      return await object.sort((a, b) => {
        a = a.date
          .split("/")
          .reverse()
          .join("");
        b = b.date
          .split("/")
          .reverse()
          .join("");
        return a < b ? 1 : a > b ? -1 : 0;
        /* return a < b ? -1 : a > b ? 1 : 0; */
      });
    }

    return object;
  } catch (e) {
    console.log("Error=>getFromDB=> ", e);
  }
};

const getPathImgs = path => {
  try {
    let photosArray = [];
    let pathExists = fs.existsSync(path);
    if (pathExists) {
      fs.readdirSync(path).forEach(file => {
        let word = file
          .sub()
          .replace(/<[/]sub>|<sub>|.jpg|.gif|.png|.mp4/gi, "");
        let byteSize = fs.statSync(path + file.substring()).size;
        let size = formatBytes(byteSize);
        let type = replaceImageToType(file);

        photosArray.push({
          name: word,
          src: path + file.substring(),
          image: base64_encode(path + file.substring()),
          type: type,
          size: size,
          byteSize: byteSize,
          id: +photosArray.length,
          video: false
        });

        /* photosArray.push({
            name: word,
            src: rememberImagesMainSrc + file.substring(),
            videoSrc:rememberImagesMainSrc.replace("src", "@") + file.substring(),
            type: type,
            size: size,
            byteSize: byteSize,
            id: +photosArray.length,
          }); */

        /* const stream = fs.createReadStream("src/assets/111.mp4");
        getVideoDurationInSeconds(stream).then((duration) => {
          console.log(duration*1000)
        }); */
      });
    }
    if (photosArray.length == 0) {
      photosArray.push({
        name: "birthday",
        src: "src/assets/birthday.jpg",
        image: base64_encode("src/assets/birthday.jpg"),
        type: ".jpg",
        id: +photosArray.length
      });
    }
    return photosArray;
  } catch (e) {
    console.log("Error=>getPathImgs=> ", e);
  }
};

const getNewsFromUrl = async () => {
  let news = [];
  await JSDOM.fromURL("https://www.ynet.co.il/home/0,7340,L-184,00.html", {
    runScripts: "outside-only"
  }).then(dom => {
    let titles = dom.window.document.querySelectorAll(".smallheader");
    let length = titles.length > 5 ? 5 : titles.length;
    for (let i = 0; i < length; i++) {
      news.push(titles[i].innerHTML);
    }
  });
  console.log("getNewsFromUrl -> news", news);
  return news;
};

app.get("/homePage", async (req, res) => {
  try {
    res.status(200).send({
      birthdayImgs: await getHomePage(),
      navNews: [
        {
          _id: "61a3ad3adfa4b04d38aafbc1",
          data: '12',
          day: 28,
          month: 11,
          year: 2021,
          date: '28/11/2021',
          disable: false,
          urlNumber: 12
        },{
          _id: "61a3ad3adfa4b04d38aafbc2",
          data: '13',
          day: 29,
          month: 11,
          year: 2021,
          date: '29/11/2021',
          disable: false,
          urlNumber: 13
        },{
          _id: "61a3ad3adfa4b04d38aafbc3",
          data: '14',
          day: 30,
          month: 11,
          year: 2021,
          date: '30/11/2021',
          disable: false,
          urlNumber: 14
        },{
          _id: "61a3ad3adfa4b04d38aafbc4",
          data: '15',
          day: 01,
          month: 12,
          year: 2021,
          date: '01/12/2021',
          disable: false,
          urlNumber: 15
        },{
          _id: "61a3ad3adfa4b04d38aafbc5",
          data: '16',
          day: 02,
          month: 12,
          year: 2021,
          date: '02/12/2021',
          disable: false,
          urlNumber: 16
        }
      ]/* await getFromDB("navNews", true) */,
      rememberImgs: await getPathImgs(rememberImagesMainSrc)
      /* ynetNews: await getNewsFromUrl() */
    });
  } catch (e) {
    console.log("Error=>homePage=> ", e);
  }
});

app.get("/getCategories", async (req, res) => {
  try {
    res.status(200).send(
      await db
        .collection("categories")
        .find({})
        .toArray()
    );
  } catch (f) {
    console.log("Error=>getCategories=>", f);
  }
});

app.get("/getNavNews", async (req, res) => {
  try {
    if (req.query.onlyDisable == "true") {
      res.status(200).send(await getFromDB("navNews", true));
    } else {
      res.status(200).send(await getFromDB("navNews", false));
    }
  } catch (e) {
    console.log("Error=>getNavNews=> ", e);
  }
});

/* app.post('/users', async  (req, res) =>{
  try{
    res.status(200).send( await  db.collection('users').find({}).toArray());
  }catch(f){
    console.log('f-log= ', f);
  }
}) */

app.get("/birthdayImgs", async (req, res) => {
  try {
    let photosArray = await getHomePage();
    res.status(200).send(photosArray);
  } catch (e) {
    res.status(200).send("Error=>birthdayImgs=>", e);
  }
});

app.get("/rememberImgs", async (req, res) => {
  try {
    res.status(200).send(await getPathImgs(rememberImagesMainSrc));
  } catch (e) {
    res.status(200).send("Error=>rememberImgs=>", e);
  }
});

app.get("/CoursesAmitim", async (req, res) => {
  try {
    res.status(200).send({
      coursesAmitimImg: await getPathImgs(coursesAmitimImagesMainSrc),
      coursesAmitimText: await getFromDB("coursesAmitim", false)
    });
  } catch (e) {
    console.log("Error=>CoursesAmitim=> ", e);
  }
});

app.get("/VacationsAbroad", async (req, res) => {
  try {
    res.status(200).send({
      vacationsAbroadImg: await getPathImgs(vacationsAbroadImagesMainSrc),
      vacationsAbroadText: await getFromDB("vacationsAbroad", false)
    });
  } catch (e) {
    console.log("Error=>VacationsAbroad=> ", e);
  }
});

app.get("/getEvents", async (req, res) => {
  try {
    let calendar = await getFromDB("calendar", false);
    for (let i = 0; i < calendar.length; i++) {
      calendar[i].id = i + 15;
    }
    res.status(200).send({
      events: calendar
    });
  } catch (e) {
    console.log("Error=>getEvents=> ", e);
  }
});

const getMaxNavNews = async () => {
  try {
    let navNews;
    navNews = await db.collection("navNews").findOne({ _id: "maxNumber" });
    return navNews;
  } catch (e) {
    console.log("Error=>getMaxNavNews=> ", e);
  }
};

const updateMaxNumber = async () => {
  try {
    if (
      (await db
        .collection("navNews")
        .find({ _id: "maxNumber" })
        .count()) > 0
    ) {
      let object = await getMaxNavNews();
      object["maxNumber"] = object["maxNumber"] + 1;
      return await new Promise((/* resolve, reject */) => {
        db.collection("navNews").updateOne(
          { _id: "maxNumber" },
          [
            {
              $set: {
                ...object
              }
            }
          ],
          err => {
            if (err) {
              console.log("Error=>const updateMaxNumber" + err);
              /* reject({ answer: false}); */
            } else {
              /* resolve({ answer: true}); */
            }
          }
        );
      });
    } else {
      console.log("Error=> const updateMaxNumber=> maxNumber לא נמצא");
      /* return { answer: false }; */
    }
  } catch (e) {
    console.log("Error=> const updateMaxNumber=> ", e);
    return false;
  }
};

const getMaxNumberFromDB = async maxNumber => {
  try {
    let navNews;
    navNews = await db
      .collection("navNews")
      .findOne({ urlNumber: parseInt(maxNumber), disable: false }, {});

    return await navNews;
  } catch (e) {
    console.log("Error=>getMaxNumberFromDB=> ", e);
  }
};

app.get("/news/:maxNumber", async (req, res) => {
  try {
    let news = await getMaxNumberFromDB(req.params.maxNumber);
    console.log("news", news);
    res.json(news);
  } catch (e) {
    console.log("Error=>news/:maxNumber=" + req.params.maxNumber + " => ", e);
  }
});

function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer.from(bitmap).toString("base64");
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

app.listen(process.env.PORT || 8000, () => {
  console.log("NodeJS App Listening", process.env.PORT || 8000);
});

const replaceImageToName = file => {
  return file.sub().replace(/<[/]sub>|<sub>|.jpg|.gif|.png/gi, "");
};

const replaceImageToType = file => {
  let word = file.sub().replace(/<[/]sub>|<sub>|.jpg|.gif|.png|.mp4/gi, "");
  return file
    .sub()
    .replace(word, "")
    .replace(/<[/]sub>|<sub>/gi, "");
  //.replace(".", "");
};
