const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: '5vh 6vw',
  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0) 70%)',
  color: '#fff',
};

const priceStyle = {
  fontSize: '3vw',
  fontWeight: 700,
  marginTop: '1vh',
  color: '#ffd166',
};

function Overlay({ item }) {
  return (
    <div style={overlayStyle}>
      <div style={{ fontSize: '4vw', fontWeight: 700, lineHeight: 1.15 }}>{item.dishName}</div>
      {item.description ? (
        <div style={{ fontSize: '1.8vw', marginTop: '1vh', maxWidth: '60vw', opacity: 0.9 }}>
          {item.description}
        </div>
      ) : null}
      <div style={priceStyle}>${Number(item.price).toFixed(2)}</div>
    </div>
  );
}

export default Overlay;
