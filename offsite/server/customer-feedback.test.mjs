import test from 'node:test'
import assert from 'node:assert/strict'
import { openStore } from './store.mjs'
import { importFeedback, loadFeedback } from '../scripts/import-customer-feedback.mjs'

test('客户素材导入：原图一致、可重复执行、保留报价与已有联系方式', () => {
  const store = openStore({ dbPath: ':memory:' })
  try {
    store.saveSiteSettings({ ...store.siteSettings(), email: 'contact@example.com', wechat: 'existing-advisor' })
    const catalog = store.publicCatalog(), content = loadFeedback()
    const imported = importFeedback(store, content)
    assert.equal(imported.caseImages.length, 10)
    assert.equal(store.siteSettings().wechatQr, content.qr)
    assert.equal(imported.contact.email, 'contact@example.com')
    assert.equal(imported.contact.wechat, 'existing-advisor')
    const { revision: beforeRevision, ...beforePricing } = catalog
    const { revision: afterRevision, ...afterPricing } = store.publicCatalog()
    assert.ok(afterRevision > beforeRevision)
    assert.deepEqual(afterPricing, beforePricing)
    for (const [index, item] of imported.caseImages.entries()) {
      assert.equal(store.caseImage(item.id), content.entries[index].image)
      assert.equal(item.category, content.entries[index].category)
    }
    const version = store.siteSettings().version
    const images = store.listCaseImages()
    assert.deepEqual(importFeedback(store, content), imported)
    assert.deepEqual(store.listCaseImages(), images)
    assert.equal(store.siteSettings().version, version)
  } finally { store.close() }
})
