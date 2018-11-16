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