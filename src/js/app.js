import $ from 'jquery';
import {parseCode} from './code-analyzer';
import {analyzed_code} from './function-parser';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();
        let res = parseCode(input_func);
        let code_table = res[1];

        let parsed_func = analyzed_code(code_table, input_func, user_input_arguments)
    });
});
