export default async () => {
  return ('ok')
  const results = await axios({
    method: 'post',
    url: 'https://licensing.aptugo.com:3456/v1/accounts/a2b77f81-611f-4259-9026-718afe568d8c/licenses/actions/validate-key',
    data: {
      meta: {
        key: get('license')
      }
    }
  })
  if ( results.data.meta.constant === 'NOT_FOUND') {
    throw('License not found')
  } else {
    return ('ok')
  }
}




