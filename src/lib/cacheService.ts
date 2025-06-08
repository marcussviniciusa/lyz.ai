interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0
  }
  
  // TTL padrão: 5 minutos
  private defaultTTL = 5 * 60 * 1000

  /**
   * Armazenar dados no cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    
    this.cache.set(key, entry)
    this.cleanExpired()
  }

  /**
   * Recuperar dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    this.stats.hits++
    return entry.data
  }

  /**
   * Verificar se existe no cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Remover item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Limpar itens expirados
   */
  private cleanExpired(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    this.cleanExpired()
    
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Gerar chave de cache para consultas RAG
   */
  generateRAGKey(query: string, category?: string, companyId?: string): string {
    const params = [
      query.toLowerCase().trim(),
      category || 'all',
      companyId || 'default'
    ].join('|')
    
    return `rag:${this.hashString(params)}`
  }

  /**
   * Gerar chave de cache para embeddings
   */
  generateEmbeddingKey(text: string): string {
    return `embedding:${this.hashString(text.toLowerCase().trim())}`
  }

  /**
   * Hash simples para gerar chaves
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Cache inteligente com fallback
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    // Tentar buscar no cache primeiro
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }
    
    // Se não encontrou, executar função e cachear resultado
    const data = await fetchFunction()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Cache específico para consultas RAG
   */
  async cacheRAGQuery<T>(
    query: string,
    category: string,
    companyId: string,
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    const key = this.generateRAGKey(query, category, companyId)
    
    // TTL maior para consultas RAG (10 minutos)
    return this.getOrSet(key, fetchFunction, 10 * 60 * 1000)
  }

  /**
   * Cache específico para embeddings
   */
  async cacheEmbedding(
    text: string,
    fetchFunction: () => Promise<number[]>
  ): Promise<number[]> {
    const key = this.generateEmbeddingKey(text)
    
    // TTL muito maior para embeddings (1 hora)
    return this.getOrSet(key, fetchFunction, 60 * 60 * 1000)
  }

  /**
   * Invalidar cache relacionado a documentos
   */
  invalidateDocumentCache(companyId: string): void {
    const pattern = `rag:`
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        // Verificar se é da empresa (mais complexo com hash, mas funcional)
        this.cache.delete(key)
      }
    }
  }

  /**
   * Limpar cache antigo periodicamente
   */
  startCleanupInterval(intervalMs: number = 5 * 60 * 1000): void {
    setInterval(() => {
      this.cleanExpired()
    }, intervalMs)
  }
}

// Singleton instance
export default new CacheService() 