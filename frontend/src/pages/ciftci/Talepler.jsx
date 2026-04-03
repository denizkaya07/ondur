import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { AuthContext } from '../../context/AuthContext'

export default function Talepler() {
  const navigate = useNavigate()
  const { kullanici, yukleniyor: authYukleniyor } = useContext(AuthContext)
  const [talepler, setTalepler]     = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islemde, setIslemde]       = useState(null)
  const [hata, setHata]             = useState('')

  const yukle = () => {
    if (!kullanici || kullanici.rol !== 'ciftci') {
      navigate('/giris')
      return
    }
    setYukleniyor(true)
    api.get('/ciftci/talepler/')
      .then(res => setTalepler(res.data))
      .catch(err => {
        console.error(err)
        setHata('Talepler yüklenirken hata oluştu.')
      })
      .finally(() => setYukleniyor(false))
  }

  useEffect(() => {
    if (authYukleniyor) return
    yukle()
  }, [authYukleniyor, kullanici])

  const yanitla = async (id, karar) => {
    setIslemde(id)
    try {
      await api.post(`/ciftci/talepler/${id}/yanit/`, { karar })
      yukle()
    } catch (err) {
      console.error(err)
    } finally {
      setIslemde(null)
    }
  }

  if (authYukleniyor || yukleniyor) return <div style={s.yuklenme}>Yükleniyor...</div>

  if (hata) return <div style={s.hataMsg}>{hata}</div>

  return (
    <div style={s.kapsayici}>
      <h2 style={s.baslik}>Bekleyen Talepler</h2>

      {talepler.length === 0 ? (
        <div style={s.bos}>
          <p style={s.bosBaslik}>Bekleyen talep yok</p>
          <p style={s.bosAlt}>Bir mühendis danışman olarak eklemek istediğinde burada görünür.</p>
        </div>
      ) : (
        <div style={s.liste}>
          {talepler.map(t => (
            <div key={t.id} style={s.kart}>
              <div style={s.kartIcerik}>
                <div style={s.ikon}>👨‍🌾</div>
                <div style={s.bilgi}>
                  <p style={s.muhendisAd}>{t.muhendis_ad}</p>
                  <p style={s.isletmeAd}>{t.isletme?.ad} için danışmanlık talebinde bulunuyor</p>
                  <p style={s.tarih}>
                    {new Date(t.talep_tarihi).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div style={s.butonlar}>
                <button
                  style={s.reddetBtn}
                  onClick={() => yanitla(t.id, 'reddet')}
                  disabled={islemde === t.id}
                >
                  Reddet
                </button>
                <button
                  style={s.onaylaBtn}
                  onClick={() => yanitla(t.id, 'onayla')}
                  disabled={islemde === t.id}
                >
                  {islemde === t.id ? 'İşleniyor…' : 'Onayla'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  kapsayici: { padding: '2rem', maxWidth: '720px', margin: '0 auto' },
  baslik:    { fontSize: '1.5rem', fontWeight: '500', marginBottom: '1.5rem', color: '#1a7a4a' },
  yuklenme:  { padding: '2rem', textAlign: 'center', color: '#888' },
  bos:       { padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '10px' },
  bosBaslik: { fontSize: '1rem', fontWeight: '500', color: '#555', margin: '0 0 6px' },
  bosAlt:    { fontSize: '0.85rem', color: '#aaa', margin: 0 },
  liste:     { display: 'flex', flexDirection: 'column', gap: '12px' },
  kart: {
    background: '#fff', border: '1px solid #e8e8e8',
    borderRadius: '12px', padding: '1.25rem',
  },
  kartIcerik: { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '1rem' },
  ikon:       { fontSize: '2rem', lineHeight: 1 },
  bilgi:      { flex: 1 },
  muhendisAd: { margin: '0 0 4px', fontWeight: '600', fontSize: '1rem' },
  isletmeAd:  { margin: '0 0 4px', fontSize: '0.9rem', color: '#555' },
  tarih:      { margin: 0, fontSize: '0.8rem', color: '#aaa' },
  butonlar:   { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  reddetBtn: {
    padding: '8px 20px', background: '#fff', color: '#e53e3e',
    border: '1px solid #e53e3e', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.9rem',
  },
  onaylaBtn: {
    padding: '8px 20px', background: '#1a7a4a', color: '#fff',
    border: 'none', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
  },
}
