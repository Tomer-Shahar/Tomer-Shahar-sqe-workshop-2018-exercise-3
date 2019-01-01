import $ from 'jquery';
import {create_flow_chart} from './graph_creator';
import * as flowchart from 'flowchart.js';



$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        $('#diagram').text('');
        if(input_func !== ''){
            let chart = create_flow_chart(input_func, user_input_arguments);
            let settings = get_settings();
            let diagram = flowchart.parse(chart);
            diagram.drawSVG('diagram', settings);
        }
    });
});

function get_settings(){
    return {
        'x': 100, 'y': 0,
        'line-width': 4, 'line-length': 55,
        'text-margin': 15,
        'font-size': 14, 'font-color': 'black',
        'line-color': 'black', 'element-color': 'black',
        'fill': '',
        'yes-text': 'T', 'no-text': 'F',
        'arrow-end': 'block', 'scale': 1.0,
        'symbols': { // style symbol types
            'start': { 'font-color': 'black', 'element-color': 'green', 'fill': 'white', 'font-size': '0' },
            'end': { 'class': 'end-element', 'fill': '#A8D18D', 'font-size': '20', 'font-color': '#A8D18D'}
        },
        'flowstate': { 'truePath': {'fill': '#A8D18D', 'font-size': 13} }
    };
}
