describe('transcribe view', () => {
  it('uploads an audio file through the signed-url flow', () => {
    cy.intercept('POST', '**/upload', {
      statusCode: 200,
      body: {
        uploadUrl: 'https://signed.example/upload',
        uploadMethod: 'PUT',
        audioKey: 'uploads/cypress-user-id/01TEST/audio.mp3',
        bucketName: 'vocl-e2e-audio',
        expiresInSeconds: 900,
        maxUploadSizeBytes: 20 * 1024 * 1024,
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      },
    }).as('requestUpload');

    cy.intercept('PUT', 'https://signed.example/upload', {
      statusCode: 200,
      body: '',
    }).as('signedUpload');

    cy.visitAuthenticated('/transcribe');

    cy.get('[data-testid="transcribe-page"]').should('be.visible');
    cy.get('[data-testid="transcribe-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('fake-audio-content'),
        fileName: 'demo.mp3',
        mimeType: 'audio/mpeg',
      },
      { force: true }
    );

    cy.get('[data-testid="transcribe-selected-file"]').should('contain.text', 'demo.mp3');
    cy.get('[data-testid="transcribe-upload-button"]').click();

    cy.wait('@requestUpload');
    cy.wait('@signedUpload');

    cy.get('[data-testid="transcribe-success"]').should(
      'contain.text',
      'Audio uploaded successfully.'
    );
    cy.get('[data-testid="transcribe-progress"]').should('contain.text', '100%');
    cy.get('[data-testid="transcribe-success"]').should(
      'contain.text',
      'uploads/cypress-user-id/01TEST/audio.mp3'
    );
  });
});
