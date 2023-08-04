import { assertEquals } from 'std/assert/assert_equals.ts';
import { escapeHtml, formatMoney, formatNumber, slugify, snakeToTitleCase } from './utils.ts';

Deno.test('that escapeHtml works', () => {
  const tests = [
    {
      input: '<a href="https://example.com">URL</a>',
      expected: '&lt;a href=&quot;https://example.com&quot;&gt;URL&lt;/a&gt;',
    },
    {
      input: '"><img onerror=\'alert(1)\' />',
      expected: '&quot;&gt;&lt;img onerror=&#039;alert(1)&#039; /&gt;',
    },
  ];

  for (const test of tests) {
    const output = escapeHtml(test.input);
    assertEquals(output, test.expected);
  }
});

Deno.test('that formatMoney works', () => {
  const tests = [
    { currency: 'USD', number: 10000, expected: '$10,000' },
    { currency: 'USD', number: 10000.5, expected: '$10,000.5' },
    { currency: 'EUR', number: 10000, expected: '€10,000' },
    { currency: 'EUR', number: 900.999, expected: '€901' },
    { currency: 'EUR', number: 900.991, expected: '€900.99' },
    { currency: 'USD', number: 50.11, expected: '$50.11' },
    { currency: 'GBP', number: 900.999, expected: '£901' },
    { currency: 'GBP', number: 900.991, expected: '£900.99' },
    { currency: 'GBP', number: 50.11, expected: '£50.11' },
  ];

  for (const test of tests) {
    const result = formatMoney(test.currency, test.number);
    assertEquals(result, test.expected);
  }
});

Deno.test('that formatNumber works', () => {
  const tests = [
    { number: 10000, expected: '10,000' },
    { number: 10000.5, expected: '10,000.5' },
    { number: 10000, expected: '10,000' },
    { number: 900.999, expected: '901' },
    { number: 900.991, expected: '900.99' },
    { number: 50.11, expected: '50.11' },
  ];

  for (const test of tests) {
    const result = formatNumber(test.number);
    assertEquals(result, test.expected);
  }
});

Deno.test('that snakeToTitleCase works', () => {
  const tests = [
    {
      input: 'helvetica_italic',
      expected: 'Helvetica Italic',
    },
    {
      input: 'some_word',
      expected: 'Some Word',
    },
    {
      input: 'helvetica',
      expected: 'Helvetica',
    },
    {
      input: 'some word',
      expected: 'Some word',
    },
    {
      input: 'times-roman',
      expected: 'Times-roman',
    },
  ];

  for (const test of tests) {
    const output = snakeToTitleCase(test.input);
    assertEquals(output, test.expected);
  }
});

Deno.test('that slugify works', () => {
  const tests = [
    {
      input: 'some word',
      expected: 'some-word',
    },
    {
      input: 'something',
      expected: 'something',
    },
    {
      input: 'ãömethíng',
      expected: 'ãömethíng',
    },
    {
      input: 'SomeOtherTest.yep',
      expected: 'someothertest.yep',
    },
    {
      input: 'almost--good-enough',
      expected: 'almost--good-enough',
    },
  ];

  for (const test of tests) {
    const output = slugify(test.input);
    assertEquals(output, test.expected);
  }
});
