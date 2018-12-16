import $ from 'jquery';
import {parseCode} from './code-analyzer';
import {analyzed_code} from './function-parser';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
        'let g1 = [3,10];\n' +
        'let g2 = 5;\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}\n' +
        'let g3 = g1[1] - 5;\n' +
        'g3 = g3 + 2;';
        user_input_arguments = '';

        //if(input_func !== '' && user_input_arguments !== ''){
            $('#codeOutput').empty();
            let parsed_func = analyzed_code(input_func, user_input_arguments);
            $('#codeOutput').append(parsed_func);
     //   }

    });
});
