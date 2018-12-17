import $ from 'jquery';
import {analyzed_code} from './function-parser';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
        'let g = 1;\n' +
        'g = 4;\n' +
        'g++;\n' +
        'g--;\n' +
        'let g2;\n' +
        'g2 = g + 3;\n' +
        'let g3 = [2, 3 ,4];\n' +
        'g2 = g2 * (g3[1] + 1);\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = [2, 4, true] ;\n' +
        '    if(b[2]){\n' +
        '        a = b[0];\n' +
        '        x = b[0];\n' +
        '    }\n' +
        '    g--;\n' +
        '    a = a + 1;\n' +
        '    a++;\n' +
        '    x--;\n' +
        '    \n' +
        '    if(a < 5){\n' +
        '        x = x + 1;\n' +
        '        let c;\n' +
        '        c = b[1];\n' +
        '        return c;\n' +
        '    }\n' +
        '}';
        user_input_arguments = '';

        //if(input_func !== '' && user_input_arguments !== ''){
        $('#codeOutput').empty();
        let parsed_func = analyzed_code(input_func, user_input_arguments);
        $('#codeOutput').append(parsed_func);
        //   }

    });
});
