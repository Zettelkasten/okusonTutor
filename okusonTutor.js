function getGroupNr() {
    var groupNr;
    text = document.getElementsByTagName('html')[0].innerText;
    groupNr = parseInt(/(Gruppe|Group number):\W*(\d{1,2})/gm.exec(text)[2]);
    return groupNr > 0 ? groupNr : null;
}