import $ from 'jquery';
import {parseCode} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let table = document.getElementById('myTable');
        let res = parseCode(codeToParse, table);
        let parsedCode = res[0];
        let code_table = res[1];
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));

        for(let i=0; i<code_table.length; i++){
            let markup = generate_markup(code_table[i]);
            $('#varTable').append(markup);
        }
    });
});

function generate_markup(code_row) {

    let line = code_row.Line;
    let type = code_row.Type;
    let name = code_row.Name;
    let condition = code_row.Condition;
    let value = code_row.Value;

    if(!condition)
        condition = '';
    if(!value)
        value = '';
    return '<tr>' + '<td>' + line + '</td>' + '<td>' + type + '</td>' + '<td>' + name + '</td>' +
        '<td>' + condition + '</td>' + '<td>' + value + '</td>' + '</tr>';
}
