const style = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '2vw',
};

/** Shown when there are zero active specials — a deliberate blank state, not an error. */
function IdleScreen() {
  return <div style={style}>No specials are currently active</div>;
}

export default IdleScreen;
