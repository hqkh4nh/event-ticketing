import { renderQrPng } from '../../src/modules/mail/qr-image';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

// One real render is enough here. Under Jest a single toBuffer call takes ~2s
// (it returns in ~40ms outside Jest), so the template spec stubs this module
// rather than paying that cost per ticket.
describe('renderQrPng', () => {
  it('produces a PNG', async () => {
    const png = await renderQrPng('TK_example.signature');

    expect(png.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(png.length).toBeGreaterThan(100);
  }, 30000);
});
