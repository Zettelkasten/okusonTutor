// ==UserScript==
// @name         Okuson Tutor
// @namespace    https://github.com/L0GL0G/okusonTutor/
// @version      0.1
// @description  Enhances Tutor experience with Okuson
// @updateURL    https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.js
// @downloadURL  https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.js
// @author       Lars Göttgens
// @match        https://www2.math.rwth-aachen.de/*
// @grant        none
// ==/UserScript==

class Student {
    static from(obj) {
        obj.setPoints = Student.prototype.setPoints;
        return obj;
    }

    constructor(matrNr, firstName, lastName) {
        this.matrNr = matrNr;
        this.firstName = firstName;
        this.lastName = lastName;
        this.points = new Object();
    }

    setPoints(exNr, points) {
        this.points[exNr] = points;
        return this;
    }
}

function getGroupNr() {
    var text = document.body.innerText;
    var groupNr = parseInt(/(Gruppe|Group number):\W*(\d{1,2})/gm.exec(text)[2]);
    return groupNr > 0 ? groupNr : null;
}

function getExerciseNr() {
    var text = document.body.innerText;
    var exNr = parseInt(/Blatt:\W*(\d{1,2})/gm.exec(text)[1]);
    return exNr;
}

function getLecture() {
    var text = document.body.innerText;
    var lecture = /Vorlesung:\W*(.*)\n/gm.exec(text)[1];
    return lecture;
}

function addDiagramLabels(data) {
    var titleNodes = Array.from(document.getElementsByTagName('h2')).filter(input => input.innerText.includes('sheet'));
    titleNodes.map(node => {
        var exNr = parseInt(/sheet (\d+)$/.exec(node.innerText)[1]);
        while (node !== null && node.nodeName.toLowerCase().localeCompare('table')) {
            node = node.nextSibling;
        }
        return (exNr, node);
    }).forEach((node, exNr) => {
        var cells = node.lastChild.firstChild.cells;
        for (var i = 0; i < cells.length - 1; i++) {
            var names = new Array();
            data.forEach(student => {
                if (Math.floor(student.points[exNr + 1]) === i) {
                    names.push(student);
                }
            });
            names = names.map(student => student.matrNr + ' ' + student.lastName + ', ' + student.firstName);
            names = names.reduce((a, b) => a + '\n' + b, '');
            cells[i].firstChild.title = names;
        }
    });
}

function extractData() {
    var data = new Map();
    var html = document.body.innerHTML;
    var inputs = Array.from(document.getElementsByTagName('input'));
    inputs = inputs.filter(input => /^P\d{5,6}$/m.test(input.name));
    var points = new Map(inputs.map(input => {
        var matrNr = parseInt(input.name.substring(1));
        var obj = new Object();
        obj.points = parseFloat(input.value);
        obj.lastName = new RegExp(matrNr + '<\\/td><td( class="trenner")?>([a-zA-Z\x7f-\xff ]+), ([a-zA-Z\x7f-\xff ]+)<').exec(html)[2];
        obj.firstName = new RegExp(matrNr + '<\\/td><td( class="trenner")?>([a-zA-Z\x7f-\xff ]+), ([a-zA-Z\x7f-\xff ]+)<').exec(html)[3];
        return [matrNr, obj];
    }));
    return points;
}

function mergeData(oldData, newData, exNr = getExerciseNr()) {
    var data = new Map();
    newData.forEach((obj, matrNr) => {
        if (oldData.has(matrNr)) {
            var student = Student.from(oldData.get(matrNr));
            student.setPoints(exNr, obj.points);
            student.firstName = obj.firstName;
            student.lastName = obj.lastName;
            data.set(matrNr, student);
        } else {
            student = new Student(matrNr, obj.firstName, obj.lastName).setPoints(exNr, obj.points);
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
    var data = JSON.parse(window.localStorage.getItem(lecture));
    if (isIterable(data)) {
        return new Map(data);
    } else {
        return new Map();
    }
}


if (window.location.pathname.endsWith('/TutorRequest')) {
    setTimeout(() => {
        document.getElementsByName('action')[0].addEventListener('click', function () {
            saveData(mergeData(loadData(), extractData()));
        })

    }, 500);
} else if (window.location.pathname.endsWith('/ShowGlobalStatistics')) {
    setTimeout(() => {
        var data = loadData();
        addDiagramLabels(data);
    }, 500);
};