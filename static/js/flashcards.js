document.addEventListener('DOMContentLoaded', () => {
    const flashcardForm = document.getElementById('flashcardForm');
    const topicInput = document.getElementById('topic');
    const numFlashcardsInput = document.getElementById('numFlashcards');
    const pdfFileInput = document.getElementById('pdfFile');
    const pdfFileNameDisplay = document.getElementById('pdfFileName');
    const generateButton = document.getElementById('generateButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    const flashcardResults = document.getElementById('flashcardResults');

    if(pdfFileInput) { // Ensure element exists before adding listener
        pdfFileInput.addEventListener('change', () => {
            if (pdfFileInput.files.length > 0) {
                pdfFileNameDisplay.textContent = `Selected: ${pdfFileInput.files[0].name}`;
            } else {
                pdfFileNameDisplay.textContent = '';
            }
        });
    }

    if(flashcardForm) { // Ensure element exists
        flashcardForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            loadingIndicator.style.display = 'block';
            errorDisplay.style.display = 'none';
            errorDisplay.textContent = '';
            flashcardResults.innerHTML = ''; // Clear previous results
            generateButton.disabled = true;

            const formData = new FormData();
            formData.append('topic', topicInput.value);
            formData.append('num_flashcards', numFlashcardsInput.value);
            if (pdfFileInput.files.length > 0) {
                formData.append('pdf_file', pdfFileInput.files[0]);
            }

            try {
                // This endpoint will be created in the next backend step
                const response = await fetch('/api/flashcards', {
                    method: 'POST',
                    body: formData
                    // No 'Content-Type' header for FormData with files, browser sets it
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}. Please try again.` }));
                    throw new Error(errorData.error || `Server responded with status ${response.status}. Please try again.`);
                }

                const data = await response.json();

                if (data.error) { // Server explicitly sends an error in JSON
                    throw new Error(data.error);
                }

                if (data.flashcards && data.flashcards.length > 0) {
                    displayFlashcards(data.flashcards);
                } else {
                    flashcardResults.innerHTML = '<p>No flashcards were generated. Try a different topic or PDF, or adjust the number of flashcards.</p>';
                }

            } catch (err) {
                console.error('Error generating flashcards:', err);
                errorDisplay.textContent = `Error: ${err.message}`;
                errorDisplay.style.display = 'block';
            } finally {
                loadingIndicator.style.display = 'none';
                generateButton.disabled = false;
            }
        });
    }

    function displayFlashcards(flashcards) {
        flashcardResults.innerHTML = '<h2>Generated Flashcards</h2>';
        flashcards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('flashcard');

            const frontDiv = document.createElement('div');
            frontDiv.classList.add('front');
            const frontHeader = document.createElement('h3');
            frontHeader.textContent = `Front (Question ${index + 1})`;
            const frontPara = document.createElement('p');
            frontPara.textContent = escapeHtml(card.front);
            frontDiv.appendChild(frontHeader);
            frontDiv.appendChild(frontPara);

            const backDiv = document.createElement('div');
            backDiv.classList.add('back');
            const backHeader = document.createElement('h3');
            backHeader.textContent = `Back (Answer ${index + 1})`;
            const backPara = document.createElement('p');
            backPara.textContent = escapeHtml(card.back);
            backDiv.appendChild(backHeader);
            backDiv.appendChild(backPara);

            cardElement.appendChild(frontDiv);
            cardElement.appendChild(backDiv);

            // Basic flip on click
            cardElement.addEventListener('click', () => {
                if (backDiv.style.display === 'none' || backDiv.style.display === '') {
                    backDiv.style.display = 'block';
                    frontDiv.style.display = 'none';
                } else {
                    backDiv.style.display = 'none';
                    frontDiv.style.display = 'block';
                }
            });
            flashcardResults.appendChild(cardElement);
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
