import $ from 'jquery';
import {parseCode} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let table = document.getElementById('myTable');
        let parsedCode = parseCode(codeToParse, table);
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));

    });
});
