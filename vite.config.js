import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // 相対パスを使用することでGitHub Pages等でも正常に動作するようにします
    server: {
        host: true // LAN内の全てのIPアドレスからのアクセスを許可
    }
})
