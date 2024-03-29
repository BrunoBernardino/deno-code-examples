import { assertEquals } from 'std/assert/assert_equals.ts';
import { abortController } from '/main.ts';

const baseUrl = 'http://localhost:8000';

Deno.test({
  name: 'HTTP Server',
  fn: async () => {
    let response = await fetch(`${baseUrl}/`);
    assertEquals(response.status, 200);

    let responseText = await response.text();
    assertEquals(responseText.includes('Deno Code Examples'), true);

    response = await fetch(`${baseUrl}/blah`);
    assertEquals(response.status, 404);

    responseText = await response.text();
    assertEquals(responseText, 'Not Found');

    abortController.abort('Test finished');
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
