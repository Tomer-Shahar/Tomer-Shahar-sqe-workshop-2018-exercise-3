import $ from 'jquery';
import {parseCode} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        $('#varTable tbody tr').remove();
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode;
        let code_table;
        let res = parseCode(codeToParse);
        parsedCode = res[0];
        code_table = res[1];
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
        for(let i=0; i<code_table.length; i++){
            let markup = generate_markup(code_table[i]);
            $('#varTable tbody').append(markup);
        }
    });
});

function generate_markup(code_row) {

    let line = code_row.Line;
    let type = code_row.Type;
    let name = code_row.Name;
    let condition = code_row.Condition.replace('<', '&lt;').replace('>','&gt;');
    let value = code_row.Value;

    if(!condition)
        condition = '';
    if(!value)
        value = '';
    return '<tr>' + '<td>' + line + '</td>' + '<td>' + type + '</td>' + '<td>' + name + '</td>' +
        '<td>' + condition + '</td>' + '<td>' + value + '</td>' + '</tr>';
}
