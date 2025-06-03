document.addEventListener('DOMContentLoaded', () => {
    const studyGuideForm = document.getElementById('studyGuideForm');
    const guideSourceTextInput = document.getElementById('guideSourceText');
    const generateGuideButton = document.getElementById('generateGuideButton');
    const loadingIndicator = document.getElementById('loadingIndicatorGuide');
    const errorDisplay = document.getElementById('errorDisplayGuide');
    const studyGuideResults = document.getElementById('studyGuideResults');

    if (studyGuideForm) {
        studyGuideForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if(loadingIndicator) loadingIndicator.style.display = 'block';
            if(errorDisplay) {
                errorDisplay.style.display = 'none';
                errorDisplay.textContent = '';
            }
            if(studyGuideResults) studyGuideResults.innerHTML = '';
            if(generateGuideButton) generateGuideButton.disabled = true;

            const payload = {
                source_text: guideSourceTextInput.value
                // Future: Add other parameters like length, sections etc.
            };

            try {
                // This endpoint will be created in the next backend step
                const response = await fetch('/api/studyguide', {
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

                if (data.study_guide_content) {
                    // Assuming backend sends HTML or plain text directly
                    // For Markdown, a client-side renderer (e.g., Showdown.js or Marked.js) would be used here.
                    // Example: studyGuideResults.innerHTML = marked(data.study_guide_markdown);
                    studyGuideResults.innerHTML = data.study_guide_content;
                } else {
                    if(studyGuideResults) studyGuideResults.innerHTML = '<p>No study guide content was generated. Try different text or topic.</p>';
                }

            } catch (err) {
                console.error('Error generating study guide:', err);
                if(errorDisplay) {
                    errorDisplay.textContent = `Error: ${err.message}`;
                    errorDisplay.style.display = 'block';
                }
            } finally {
                if(loadingIndicator) loadingIndicator.style.display = 'none';
                if(generateGuideButton) generateGuideButton.disabled = false;
            }
        });
    }
    // No separate displayStudyGuide function needed if just setting innerHTML directly.
    // If complex rendering or Markdown parsing were needed, a helper function would be beneficial.
});
