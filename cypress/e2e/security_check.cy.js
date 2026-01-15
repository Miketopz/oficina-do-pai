describe('Security & Integrity - New Service Flow', () => {
    const MOCK_EXISTING_PLATE = 'ABC1234';
    const MOCK_OWNER_NAME = 'João da Silva';
    const MOCK_OWNER_ID = 'owner-uuid-123';

    beforeEach(() => {
        // Intercept default Supabase calls to avoid hitting real production DB
        cy.intercept('GET', '**/rest/v1/vehicles*', (req) => {
            // Mock query for checking if plate exists
            if (req.url.includes(`plate=eq.${MOCK_EXISTING_PLATE}`)) {
                req.reply({
                    statusCode: 200,
                    body: [{
                        id: 'vehicle-123',
                        model: 'Fiat Uno',
                        client_id: MOCK_OWNER_ID,
                        client: { name: MOCK_OWNER_NAME, phone: '11999999999' }
                    }]
                });
            }
        }).as('checkPlate');

        // Mock Client Lookup (to prevent 404/delay on the "Attacker" ID)
        cy.intercept('GET', '**/rest/v1/clients*', {
            statusCode: 200,
            body: { id: 'attacker-uuid-999', name: 'Attacker Client', phone: '11988887777' }
        }).as('checkClient');
    });

    it('SHIELD: Blocks registration of existing plate for different client', () => {
        // 1. Visit page with a DIFFERENT client ID (simulate "Client B" trying to add Client A's car)
        // We mock the pre-filled client to be someone else
        const ATTACKER_ID = 'attacker-uuid-999';

        // Visit page pretending to be adding for "Attacker Client" WITH HEADER BYPASS
        cy.visit(`/new?clientId=${ATTACKER_ID}`, {
            timeout: 30000,
            headers: { 'x-e2e-bypass': 'true' }
        });

        // 2. Type an unsuspecting victim's plate
        cy.get('input[name="vehiclePlate"]', { timeout: 20000 }).type(MOCK_EXISTING_PLATE);
        cy.get('input[name="vehiclePlate"]').blur();

        // 3. Verify the "Shield" activates
        // The code logic uses toast.error
        cy.contains(`Atenção! Esta placa pertence ao cliente ${MOCK_OWNER_NAME}`).should('be.visible');

        // 4. Verify the input was cleared (Security measure implemented in code)
        cy.get('input[name="vehiclePlate"]').should('have.value', '');
    });
});
