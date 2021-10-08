# Aptugo Command Line Client

Aptugo is a new way to create applications by using a template previously set. It offers a modern build setup with no configuration for any programming language.

It is language agnostic and can create MVC systems, or front/back end splits.

**📚 Documentation:** [Comming soon](https://docs.aptugo.com/)

**📦 Package:** [npm](https://www.npmjs.com/package/aptugocli.ent)

![version](https://img.shields.io/npm/v/aptugocli.ent)
![version](https://img.shields.io/npm/dm/aptugocli.ent)

---

## Install instructions

Install normally as you would do with every package (recommended to be installed globally), as Aptugo doesn't leave traces of Aptugo in your applications.

```bash
npm i aptugocli.ent -g
```

You also need to have a templating system, you can use Aptugo's public template/boilerplate, which comes with common options and extremelly clean:

* MERN stack: MongoDB - ExpressJS - ReactJS - Node
* API communication between back and front-end
* Typescript
* Webpack
* And the usual suspects... (Redux, MaterialUI, etc)

Download it from here: [Aptugo Base Templates and Structures](https://github.com/Aptugo/Base.git)

It comes with two different folders: _Templates_ and _Structures_. 



## First time usage

Just run Aptugo without any parameters for the initial setup:

```bash
aptugo
````

You'll be asked for the location of 4 different folders:

* **Applications Folder**: This is the folder Aptugo will use to store your created applications metadata

* **Templates Folder**: That's the folder in which you have downloaded or clonned the template system (Templates)

* **Structures Folder**: The second folder from the template system (Structures)

* **Build Folder**: The folder in which your software will be built

Now, you're ready to start creating applications at the _speed of though!_

## Usage instructions

### Create a new application

```bash
aptugo new
````

That's it 🤷‍♂️, now head to your Builds folder and enjoy your application

