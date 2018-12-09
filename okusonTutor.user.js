// ==UserScript==
// @name         Okuson Tutor
// @namespace    https://github.com/L0GL0G/okusonTutor/
// @version      0.3.4
// @description  Enhances Tutor experience with Okuson
// @updateURL    https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.user.js
// @downloadURL  https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.user.js
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

function getMaxPoints() {
    var points = 0;
    var regex = /<tr><td>[.\d]+<\/td><td>(\d+)<\/td>(<td>[.\d]+<\/td>){3}<td>(\d+)<\/td>(<td>[.\d]+<\/td>){5}<\/tr>/gm;
    var html = document.body.innerHTML;
    var m;
    // eslint-disable-next-line no-cond-assign
    while (m = regex.exec(html)) {
        if (m && parseInt(m[1]) > 0) {
            points += parseInt(m[3]);
        }
    }
    return points;
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

function addOverviewDiagram(data, maxpoints, numClasses) {
    var i;
    var studentsByPoints = new Map();
    for (i = 0; i <= numClasses; i++) {
        studentsByPoints.set(i, new Array());
    }
    data.forEach(student => {
        var points = Object.values(student.points).reduce((a, b) => a + b, 0);
        student.sum = points;
        if (points === maxpoints) {
            points -= 0.001;
        }
        points = Math.floor(points * numClasses / maxpoints);
        studentsByPoints.get(points).push(student);
    });
    var max = 0;
    var sum = 0;
    studentsByPoints.forEach(array => {
        sum += array.length;
        if (array.length > max) {
            max = array.length;
        }
    });
    var diagramOV = '<h2>Points Overview</h2>\n<table class="pointdistribution">\n<tr class="pddata">';
    for (i = 0; i < numClasses; i++) {
        var names = studentsByPoints.get(i).map(student => student.matrNr + ' ' + student.sum + ' ' + student.lastName + ', ' + student.firstName);
        names = names.reduce((a, b) => a + '\n' + b, '');
        diagramOV += '<td><img src="images/red.png" alt="" width="10px" height="' + Math.floor(200 * studentsByPoints.get(i).length / max) + 'px" title="' + names + '" /></td>';
    }
    diagramOV += '<td class="summary"></td></tr>\n<tr class="pdtext">';
    for (i = 0; i < numClasses; i++) {
        diagramOV += '<td>' + studentsByPoints.get(i).length + '</td>';
    }
    diagramOV += '<td class="summary">Sum: ' + sum + '</td></tr>\n<tr class="pdpercentage">';
    for (i = 0; i < numClasses; i++) {
        diagramOV += '<td>' + Math.floor(studentsByPoints.get(i).length * 100 / sum) + '</td>';
    }

    diagramOV += '<td class="summary">%</td></tr>\n<tr class="pdindex">';
    for (i = 0; i < numClasses; i++) {
        diagramOV += '<td>' + Math.floor(i * maxpoints / numClasses) + '</td>';
    }
    diagramOV += '<td class="summary"></td></tr>\n<tr class="pdindex">';
    for (i = 1; i <= numClasses; i++) {
        var temp = Math.floor(i * maxpoints / numClasses - 1);
        if (i == numClasses) {
            temp = maxpoints;
        }
        diagramOV += '<td>' + temp + '</td>';
    }
    diagramOV += '<td></td><td class="summary"></td></tr></table>';
    var tableOV = document.createElement('div');
    tableOV.innerHTML = diagramOV;

    var tablePF = document.getElementById('passFailDiv');
    tablePF.after(tableOV);
}

function addPassFail(data, maxpoints) {
    var passed = 0;
    var failed = 0;
    var passedStudents = new Array();
    var failedStudents = new Array();
    var sum = 0;
    data.forEach(student => {
        sum++;
        var points = Object.values(student.points).reduce((a, b) => a + b, 0);
        student.sum = points;
        if (student.sum >= 0.5 * maxpoints) {
            passed++;
            passedStudents.push(student);
        } else {
            failed++;
            failedStudents.push(student);
        }
    })
    passedStudents = passedStudents.sort((a, b) => b.sum - a.sum).map(student => student.matrNr + ' ' + student.sum + ' ' + student.lastName + ', ' + student.firstName);
    passedStudents = passedStudents.reduce((a, b) => a + '\n' + b, '');
    failedStudents = failedStudents.sort((a, b) => a.sum - b.sum).map(student => student.matrNr + ' ' + student.sum + ' ' + student.lastName + ', ' + student.firstName);
    failedStudents = failedStudents.reduce((a, b) => a + '\n' + b, '');
    var diagramPF = '<h2>Pass / Fail Overview</h2>\n<table id="passFailTable"><tr><td><b>&ge; 50%</b></td><td>' + passed + '</td><td>' + Math.floor(passed / sum * 100) +
        '%</td><td><img src="images/red.png" alt="" width="' + Math.floor(passed / sum * 300) +
        'px" height="10px" title="' + passedStudents + '"></td></tr><tr><td><b>&lt; 50%</b></td><td>' + failed + '</td><td>' + Math.floor(failed / sum * 100) +
        '%</td><td><img src="images/red.png" alt="" width="' + Math.floor(failed / sum * 300) +
        'px" height="10px" title="' + failedStudents + '"></td></tr></table>';
    var tablePF = document.createElement('div');
    tablePF.id = 'passFailDiv';
    tablePF.innerHTML = diagramPF;
    document.querySelector('table.scorestable').after(tablePF);
}

function extractData() {
    var html = document.body.innerHTML;
    var inputs = Array.from(document.getElementsByTagName('input'));
    inputs = inputs.filter(input => /^P\d{5,6}$/m.test(input.name));
    var points = new Map(inputs.map(input => {
        var matrNr = parseInt(input.name.substring(1));
        var obj = new Object();
        obj.points = parseFloat(input.value);
        obj.lastName = new RegExp(matrNr + '<\\/td><td( class="trenner")?>([-a-zA-Z\x7f-\xff ]+), ([-a-zA-Z\x7f-\xff ]+)<').exec(html)[2];
        obj.firstName = new RegExp(matrNr + '<\\/td><td( class="trenner")?>([-a-zA-Z\x7f-\xff ]+), ([-a-zA-Z\x7f-\xff ]+)<').exec(html)[3];
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

function saveData(data, lecture = getLecture(), groupNr = getGroupNr()) {
    window.localStorage.setItem(lecture + ', ' + groupNr, JSON.stringify([...data]));
}

function loadData(lecture = getLecture(), groupNr = getGroupNr()) {
    var data = JSON.parse(window.localStorage.getItem(lecture + ', ' + groupNr));
    if (isIterable(data)) {
        return new Map(data);
    } else {
        return new Map();
    }
}

(function () {
    if (window.location.pathname.endsWith('/TutorRequest')) {
        document.getElementsByName('action')[0].addEventListener('click', function () {
            saveData(mergeData(loadData(), extractData()));
        })
    } else if (window.location.pathname.endsWith('/ShowGlobalStatistics')) {
        var data = loadData();
        addPassFail(data, getMaxPoints());
        addOverviewDiagram(data, getMaxPoints(), 20);
        addDiagramLabels(data);
    }
})();