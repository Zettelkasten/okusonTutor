// ==UserScript==
// @name         Okuson Tutor
// @namespace    https://github.com/L0GL0G/okusonTutor/
// @version      0.5.3
// @description  Enhances Tutor experience with Okuson
// @updateURL    https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.user.js
// @downloadURL  https://raw.githubusercontent.com/L0GL0G/okusonTutor/master/okusonTutor.user.js
// @author       Lars Göttgens
// @author       Zettelkasten
// @match        https://www2.math.rwth-aachen.de/*
// @require      http://code.jquery.com/jquery-3.3.1.min.js
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
    var regex = /<tr><td[ ="A-Za-z]*>[.\d]+<\/td><td>(\d+)<\/td>(<td>[.\d]+<\/td>){3}<td>(\d+)<\/td>(<td>[.\d]+<\/td>){5}<\/tr>/gm;
    var html = document.body.innerHTML;
    var m;
    while (m = regex.exec(html)) {
        if (m && parseInt(m[1]) > 0) {
            points += parseInt(m[3]);
        }
    }
    return points;
}

function isIterable(value) {
    return Symbol.iterator in Object(value);
}

function median(values) {
    values.sort(function (a, b) {
        return a - b;
    });
    if (values.length === 0) {
        return 0
    }
    var half = Math.floor(values.length / 2);
    if (values.length % 2) {
        return values[half];
    } else {
        return (values[half - 1] + values[half]) / 2.0;
    }
}

function average(values) {
    var sum = values.reduce((a, b) => a + b, 0);
    return values.length > 0 ? sum / values.length : 0;
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

function checkData(data, exNr, count, av, med) {
    var list = new Array();
    data.forEach(student => {
        if (student.points.hasOwnProperty(exNr) && student.points[exNr] !== null) {
            list.push(student.points[exNr]);
        }
    });
    if (list.length !== count) {
        return false;
    }
    if (Math.round(average(list) * 100) !== av * 100) {
        return false;
    }
    if (median(list) !== med) {
        return false;
    }
    return true;
}

function addDataVerification(data) {
    var table = document.getElementsByClassName('scorestable')[0];
    var regex = /<tr><td>(\d+)<\/td><td>(\d+)<\/td><td>([.\d]+)<\/td><td>([.\d]+)<\/td>/gm;
    var m;
    while (m = regex.exec(table.innerHTML)) {
        if (m) {
            var checked = checkData(data, parseInt(m[1]), parseInt(m[2]), parseFloat(m[3]), parseFloat(m[4]));
            if (!checked) {
                var td = Array.from(table.getElementsByTagName('tr')).filter(x => parseInt(x.firstChild.innerHTML) == parseInt(m[1]))[0].firstChild;
                td.bgColor = 'Red';
            }
        }
    }
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

function addPassFail(data, maxpoints, ignore0P = true) {
    var passed = 0;
    var failed = 0;
    var passedStudents = new Array();
    var failedStudents = new Array();
    var sum = 0;
    data.forEach(student => {
        var points = Object.values(student.points).reduce((a, b) => a + b, 0);
        student.sum = points;
        if (!ignore0P || student.sum > 0) {
            sum++;
            if (student.sum >= 0.5 * maxpoints) {
                passed++;
                passedStudents.push(student);
            } else {
                failed++;
                failedStudents.push(student);
            }
        }
    })
    passedStudents = passedStudents.sort((a, b) => b.sum - a.sum).map(student => student.matrNr + ' ' + student.sum + ' ' + student.lastName + ', ' + student.firstName);
    passedStudents = passedStudents.reduce((a, b) => a + '\n' + b, '');
    failedStudents = failedStudents.sort((a, b) => a.sum - b.sum).map(student => student.matrNr + ' ' + student.sum + ' ' + student.lastName + ', ' + student.firstName);
    failedStudents = failedStudents.reduce((a, b) => a + '\n' + b, '');
    var diagramPF = '<h2>Pass / Fail Overview</h2>\n<p><input type="checkbox" name="ignore0P" id="ignore0P"' + (ignore0P ? ' checked' : '') + '>\n<label for="ignore0P">Ignore students with 0 Points</label></p>\n<table id="passFailTable"><tr><td><b>&ge; 50%</b></td><td>' + passed + '</td><td>' + Math.floor(passed / sum * 100) +
        '%</td><td><img src="images/red.png" alt="" width="' + Math.floor(passed / sum * 300) +
        'px" height="10px" title="' + passedStudents + '"></td></tr><tr><td><b>&lt; 50%</b></td><td>' + failed + '</td><td>' + Math.floor(failed / sum * 100) +
        '%</td><td><img src="images/red.png" alt="" width="' + Math.floor(failed / sum * 300) +
        'px" height="10px" title="' + failedStudents + '"></td></tr></table>';
    var tablePF;
    if (tablePF = document.getElementById('passFailDiv')) {
        tablePF.innerHTML = diagramPF;
    } else {
        tablePF = document.createElement('div');
        tablePF.id = 'passFailDiv';
        tablePF.innerHTML = diagramPF;
        document.querySelector('table.scorestable').after(tablePF);
    }
    document.getElementById('ignore0P').addEventListener('click', function () {
        addPassFail(loadData(), getMaxPoints(), document.getElementById('ignore0P').checked)
    });
}


let studentPointsSum = (student) => Object.values(student.points).reduce((a, b) => a + b);

let sortByMatrNr = (a, b) => (String.toLocaleString(a.matrNr).localeCompare(b.matrNr));
let sortByName = (a, b) => (String.toLocaleString(a.lastName + ', ' + a.firstName).localeCompare(b.lastName + ', ' + b.firstName));
let sortByPointsSum = (a, b) => -1 * (studentPointsSum(a) - studentPointsSum(b));

// Add list of students
function addStudentList(data, sortBy = sortByMatrNr) {
    let html = '';
    html += '<div id="studentListDiv"><h2>Student List</h2>';
    html += '<style>.exercisePoints { text-align: center; }</style>';
    html += '<input type="text" class="studentListFilter" placeholder="Filter list &hellip;">'
    html += '<table id="studentListTable">';
    html += '</table>';
    html += '<em class="studentListEmpty" style="display: none;">No entries found.</em>';
    html += '</div>';
    if ($('#studentListDiv').html()) {
        $('#studentListDiv').html(html);
    } else {
        $('table').last().after(html);
    }

    updateStudentListData(data, sortBy);

    // Handler for student list filter: Update table entries everytime filter changes
    $('.studentListFilter').on('change keyup paste', function () { updateStudentListFilter($(this).val()); });
}

function updateStudentListData(data, sortBy) {
    // find number of assignments we have data for
    let assignmentSet = new Set();
    data.forEach(student => (Object.keys(student.points).forEach(key => assignmentSet.add(key))));
    let assignments = Array.from(assignmentSet).sort();

    html = '<tr class="studentListHeader">';
    html += '<th data-sortBy="matrNr">Matr. Nr.</th><th data-sortBy="name">Name</th><th data-sortBy="pointsSum">&Sigma;</th>';
    html += assignments.map(a => '<th data-sortBy="pointsExercise" data-sortByExercise="' + a + '">' + a + '</th>').join('');
    html += '</tr>';

    let sortedData = Array.from(data.values()).sort(sortBy);

    sortedData.forEach(student => {
        html += '<tr data-keywords="' + student.matrNr + ' ' + student.lastName + ' ' + student.firstName + '" class="studentListRow">';
        html += '<td>' + student.matrNr + '</td><td>' + student.lastName + ', ' + student.firstName + '</td>';
        html += '<td class="exercisePoints exercisePointsSum">' + studentPointsSum(student) + '</td>';
        html += assignments.map(a => {
            if ((a in student.points) && student.points[a] !== null) {
                return '<td class="exercisePoints">' + student.points[a] + '</td>'
            } else {
                return '<td class="exercisePoints exercisePointsNull"> - </td>';
            }
        }).join('');
        html += '</tr>';
    });

    $('#studentListTable').html(html);
    updateStudentListFilter();

    // Handler for student list sorting
    $('.studentListHeader th').on('click', function() {
        let sortBy = $(this).data('sortby');  // has to be lower case for some reason
        if (sortBy !== undefined) {
            let sorter;
            switch (sortBy) {
                default:
                    return;
                case 'matrNr':
                    sorter = sortByMatrNr;
                    break;
                case 'name':
                    sorter = sortByName;
                    break;
                case 'pointsSum':
                    sorter = sortByPointsSum;
                    break;
                case 'pointsExercise':
                    let exercise = $(this).data('sortbyexercise');
                    sorter = (a, b) => -1 * (a.points[exercise] - b.points[exercise]);
                    break;
            }
            updateStudentListData(data, sorter);
        }
    });
}

function updateStudentListFilter(queryString = $('.studentListFilter').val()) {
    // sync all .studentListFilter texts (in case there are multiple ones)
    $('.studentListFilter').val(queryString);
    var query = queryString.toLowerCase();

    var showSomething = false;
    var terms = query.split(/[ ,;]+/);
    if (terms.length) {
      // filter search results
      $('.studentListRow').each(function() {
        var showThis = true;
        var keywords = $(this).data('keywords').toLowerCase();
        for (var i in terms) {
          var term = terms[i];
          // ensure term is contained in keywords
          if (keywords.indexOf(term) === -1) {
            showThis = false;
            break;
          }
        }

        if (showThis) {
          $(this).show();
          showSomething = true;
        } else {
          $(this).hide();
        }
      });
    }

    if (showSomething) {
      $('.studentListEmpty').hide();
    } else {
      $('.studentListEmpty').show();
    }
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

(function () {
    if (window.location.pathname.endsWith('/TutorRequest')) {
        document.getElementsByName('action')[0].addEventListener('click', function () {
            saveData(mergeData(loadData(), extractData()));
        })
    } else if (window.location.pathname.endsWith('/ShowGlobalStatistics')) {
        var data = loadData();
        addDataVerification(data);
        addPassFail(data, getMaxPoints());
        addOverviewDiagram(data, getMaxPoints(), 20);
        addDiagramLabels(data);
        addStudentList(data);
    }
})();
