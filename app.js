const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");

const router = require("./routers/myrouter");
const auth = require("./routers/routerAuth");
const emp = require("./routers/employeeRouter")
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true,
  }),
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(router);
app.use(auth);
app.use(emp)
app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, () => {
  console.log("Starting server at port: http://localhost:8080/");
});
