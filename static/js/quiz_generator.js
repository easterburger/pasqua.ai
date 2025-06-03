document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quizForm');
    const sourceTextInput = document.getElementById('sourceText');
    const numQuestionsInput = document.getElementById('numQuestions');
    const generateQuizButton = document.getElementById('generateQuizButton');
    const loadingIndicator = document.getElementById('loadingIndicatorQuiz');
    const errorDisplay = document.getElementById('errorDisplayQuiz');
    const quizResults = document.getElementById('quizResults');

    if (quizForm) {
        quizForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if(loadingIndicator) loadingIndicator.style.display = 'block';
            if(errorDisplay) {
                errorDisplay.style.display = 'none';
                errorDisplay.textContent = '';
            }
            if(quizResults) quizResults.innerHTML = '';
            if(generateQuizButton) generateQuizButton.disabled = true;

            const payload = {
                source_text: sourceTextInput.value,
                num_questions: parseInt(numQuestionsInput.value)
            };

            try {
                // This endpoint will be created in the next backend step
                const response = await fetch('/api/quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}. Please try again.` }));
                    throw new Error(errorData.error || `Server responded with status ${response.status}. Please try again.`);
                }

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.quiz && data.quiz.length > 0) {
                    displayQuiz(data.quiz);
                } else {
                    if(quizResults) quizResults.innerHTML = '<p>No quiz questions were generated. Try different text or topic.</p>';
                }

            } catch (err) {
                console.error('Error generating quiz:', err);
                if(errorDisplay) {
                    errorDisplay.textContent = `Error: ${err.message}`;
                    errorDisplay.style.display = 'block';
                }
            } finally {
                if(loadingIndicator) loadingIndicator.style.display = 'none';
                if(generateQuizButton) generateQuizButton.disabled = false;
            }
        });
    }

    function displayQuiz(questions) {
        if(!quizResults) return;
        quizResults.innerHTML = '<h2>Generated Quiz</h2>';
        questions.forEach((q, index) => {
            const questionElement = document.createElement('div');
            questionElement.classList.add('quiz-question');

            let optionsHTML = '';
            if (q.options && Array.isArray(q.options) && q.options.length > 0) {
                optionsHTML = '<ul class="options-list">';
                q.options.forEach(opt => {
                    optionsHTML += `<li>${escapeHtml(opt)}</li>`;
                });
                optionsHTML += '</ul>';
            }

            const answerId = `answer-${index}`;
            const questionTextPara = document.createElement('p');
            questionTextPara.classList.add('question-text');
            questionTextPara.textContent = `${index + 1}. ${escapeHtml(q.question)}`;

            questionElement.appendChild(questionTextPara);
            if(optionsHTML) questionElement.insertAdjacentHTML('beforeend', optionsHTML);

            const showAnswerButton = document.createElement('button');
            showAnswerButton.classList.add('show-answer-btn');
            showAnswerButton.dataset.answerid = answerId;
            showAnswerButton.textContent = 'Show Answer';

            const answerDiv = document.createElement('div');
            answerDiv.classList.add('answer');
            answerDiv.id = answerId;
            answerDiv.style.display = 'none';
            answerDiv.innerHTML = `<strong>Answer:</strong> ${escapeHtml(q.answer)}`;

            questionElement.appendChild(showAnswerButton);
            questionElement.appendChild(answerDiv);

            quizResults.appendChild(questionElement);
        });

        document.querySelectorAll('.show-answer-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetAnswerId = e.target.dataset.answerid;
                const answerDiv = document.getElementById(targetAnswerId);
                if (answerDiv) {
                    const isHidden = answerDiv.style.display === 'none';
                    answerDiv.style.display = isHidden ? 'block' : 'none';
                    e.target.textContent = isHidden ? 'Hide Answer' : 'Show Answer';
                }
            });
        });
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            console.warn("escapeHtml called with non-string value:", unsafe);
            return '';
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
