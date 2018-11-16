class Student {
    static from(obj) {
        obj.setPoints = Student.prototype.setPoints;
        return obj;
      }

    constructor(matrNr) {
        this.matrNr = matrNr;
        this.points = new Object();
    }

    setPoints(exNr, points) {
        this.points[exNr] = points;
        return this;
    }
}

function getGroupNr() {
    var groupNr;
    text = document.getElementsByTagName('html')[0].innerText;
    groupNr = parseInt(/(Gruppe|Group number):\W*(\d{1,2})/gm.exec(text)[2]);
    return groupNr > 0 ? groupNr : null;
}

function getExerciseNr() {
    var exNr;
    text = document.getElementsByTagName('html')[0].innerText;
    exNr = parseInt(/Blatt:\W*(\d{1,2})/gm.exec(text)[1]);
    return exNr;
}

function getLecture() {
    var lecture = "";
    text = document.getElementsByTagName('html')[0].innerText;
    lecture = /Vorlesung:\W*(.*)\n/gm.exec(text)[1];
    return lecture;
}

function extractData() {
    var inputs = Array.from(document.getElementsByTagName('input'));
    inputs = inputs.filter(input => /^P\d{5,6}$/m.test(input.name));
    var points = new Map(inputs.map(input => [parseInt(input.name.substring(1)), parseFloat(input.value)]));
    return points;
}

function mergeData(oldData, newData, exNr = getExerciseNr()) {
    var data = new Map();
    newData.forEach((points, matrNr) => {
        if (oldData.has(matrNr)) {
            student = Student.from(oldData.get(matrNr));
            student.setPoints(exNr, points);
            data.set(matrNr, student);
        } else {
            student = new Student(matrNr).setPoints(exNr, points);
            data.set(matrNr, student);
        }
    });
    return data;
}

function isIterable(value) {
    return Symbol.iterator in Object(value);
}

function saveData(data, lecture = getLecture()) {
    window.localStorage.setItem(lecture, JSON.stringify([...data]));
}

function loadData(lecture = getLecture()) {
    console.log(lecture);
    var data = JSON.parse(window.localStorage.getItem(lecture));
    if (isIterable(data)) {
        return new Map(data);
    } else {
        return new Map();
    }
}