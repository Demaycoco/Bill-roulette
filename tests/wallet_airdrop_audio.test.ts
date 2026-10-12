import test, { describe } from 'node:test';
import assert from 'node:assert';
import { Keypair } from '@solana/web3.js';
import { walletService } from '../src/services/walletService.ts';
import { sound } from '../src/utils/audio.ts';

describe('Mainnet Wallet Integration & Audio API Protocol Tests', () => {
  test('1. SoundEngine provides playClick, playSpin, playTick, playWinnerFanfare without error', () => {
    assert.strictEqual(typeof sound.playClick, 'function');
    assert.strictEqual(typeof sound.playSpin, 'function');
    assert.strictEqual(typeof sound.playTick, 'function');
    assert.strictEqual(typeof sound.playWinnerFanfare, 'function');

    // Verify safe execution (does not throw even without browser AudioContext in Node)
    assert.doesNotThrow(() => {
      sound.playClick();
      sound.playSpin();
      sound.playTick(1.2);
      sound.playWinnerFanfare();
    });
  });

  test('2. Request Airdrop rejects gracefully when wallet is not connected', async () => {
    await walletService.disconnect();
    const result = await walletService.requestAirdrop();

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.errorCode, 'NO_WALLET');
    assert.match(result.error || '', /No wallet connected/i);
  });

  test('3. WalletService reports available standard Solana wallet adapters', () => {
    const wallets = walletService.getAvailableWallets();
    assert.ok(Array.isArray(wallets));
    assert.ok(wallets.some((w) => w.id === 'phantom'));
    assert.ok(wallets.some((w) => w.id === 'solflare'));
    assert.ok(wallets.some((w) => w.id === 'backpack'));
  });

  test('4. Request Airdrop provides structured result on Solana Devnet without hanging', async () => {
    const testPubkey = Keypair.generate().publicKey.toBase58();
    const result = await walletService.requestAirdrop(testPubkey);
    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.balanceRefreshed, 'boolean');
    if (!result.success) {
      assert.ok(result.errorCode);
      assert.ok(result.error);
    }
  });

  test('5. Disconnect resets wallet state cleanly', async () => {
    await walletService.disconnect();
    const state = walletService.getState();
    assert.strictEqual(state.connected, false);
    assert.strictEqual(state.publicKey, null);
  });
});
