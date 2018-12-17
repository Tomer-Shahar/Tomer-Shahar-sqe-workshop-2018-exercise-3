import $ from 'jquery';
import {analyzed_code} from './function-parser';


$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        if(input_func !== ''){
            $('#codeOutput').empty();
            let parsed_func = analyzed_code(input_func, user_input_arguments);
            $('#codeOutput').append(parsed_func);
        }

    });
});
