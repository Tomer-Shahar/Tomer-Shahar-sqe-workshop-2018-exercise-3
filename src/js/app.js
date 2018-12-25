import $ from 'jquery';
import {create_flow_chart} from './graph_creator';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
            'function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +
            '    let c = 0;\n' +
            '    \n' +
            '    if (b < z) {\n' +
            '        c = c + 5;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '    }\n' +
            '    \n' +
            '    return c;\n' +
            '}\n';

        $('#diagram').text('');

        user_input_arguments = '1,2,3';

        if(input_func !== ''){
            let chart_and_settings = create_flow_chart(input_func, user_input_arguments);
            let diagram = chart_and_settings[0];
            let options = chart_and_settings[1];
            diagram.drawSVG('diagram', options);
        }


    });
});
