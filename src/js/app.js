import $ from 'jquery';
import {create_flow_chart, get_settings} from './graph_creator';
import * as flowchart from 'flowchart.js';



$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
            'function foo(x){\n' +
            '    let a, b = 4;\n' +
            '    let c = 3;\n' +
            '    a = b + c\n' +
            '    if(a < x){\n' +
            '        a = 10\n' +
            '    }\n' +
            '    return a;\n' +
            '}';

        $('#diagram').text('');

        user_input_arguments = '1,2,3';

        if(input_func !== ''){
            let chart = create_flow_chart(input_func, user_input_arguments);
            let settings = get_settings();
            let diagram = flowchart.parse(chart);
            diagram.drawSVG('diagram', settings);
        }


    });
});
