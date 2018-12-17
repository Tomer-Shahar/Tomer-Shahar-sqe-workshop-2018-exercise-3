import $ from 'jquery';
import {analyzed_code} from './function-parser';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
        'function foo(x, y, z){\n' +
        '    if(x) {\n' +
        '        z++;\n' +
        '        return 10;\n' +
        '    } else if(y === "sqe") {\n' +
        '        return 20;\n' +
        '    }\n' +
        '    return 50;\n' +
        '}';
        user_input_arguments = 'false, "sqe", 0';

        //if(input_func !== '' && user_input_arguments !== ''){
        $('#codeOutput').empty();
        let parsed_func = analyzed_code(input_func, user_input_arguments);
        $('#codeOutput').append(parsed_func);
        //   }

    });
});
