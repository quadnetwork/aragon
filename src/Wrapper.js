import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Apps, Permissions, Settings } from './apps'
import ethereumLoadingAnimation from './assets/ethereum-loading.svg'
import AppIFrame from './components/App/AppIFrame'
import App404 from './components/App404/App404'
import Home from './components/Home/Home'
import MenuPanel from './components/MenuPanel/MenuPanel'
import SignerPanel from './components/SignerPanel/SignerPanel'
import DeprecatedBanner from './components/DeprecatedBanner/DeprecatedBanner'
import { DaoAddressType } from './prop-types'
import { getAppPath } from './routing'
import { staticApps } from './static-apps'
import { addressesEqual } from './web3-utils'
import { noop, isSmallScreen } from './utils'
import {
  APPS_STATUS_ERROR,
  APPS_STATUS_READY,
  APPS_STATUS_LOADING,
} from './symbols'

class Wrapper extends React.Component {
  static propTypes = {
    account: PropTypes.string.isRequired,
    apps: PropTypes.array.isRequired,
    appsStatus: PropTypes.oneOf([
      APPS_STATUS_ERROR,
      APPS_STATUS_READY,
      APPS_STATUS_LOADING,
    ]).isRequired,
    banner: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.shape({
        type: PropTypes.oneOf([DeprecatedBanner]),
      }),
    ]).isRequired,
    connected: PropTypes.bool.isRequired,
    daoAddress: DaoAddressType.isRequired,
    historyBack: PropTypes.func.isRequired,
    historyPush: PropTypes.func.isRequired,
    locator: PropTypes.object.isRequired,
    onRequestAppsReload: PropTypes.func.isRequired,
    permissionsLoading: PropTypes.bool.isRequired,
    transactionBag: PropTypes.object,
    walletNetwork: PropTypes.string.isRequired,
    walletWeb3: PropTypes.object,
    walletProviderId: PropTypes.string,
    wrapper: PropTypes.object,
    onRequestEnable: PropTypes.func,
  }

  static defaultProps = {
    account: '',
    apps: [],
    banner: null,
    connected: false,
    daoAddress: '',
    historyBack: noop,
    historyPush: noop,
    locator: {},
    onRequestEnable: noop,
    transactionBag: null,
    walletNetwork: '',
    walletProviderId: '',
    walletWeb3: null,
    wrapper: null,
  }
  state = {
    appInstance: {},
    menuPanelOpened: !isSmallScreen(),
  }
  openApp = (instanceId, params) => {
    if (isSmallScreen()) {
      this.handleMenuPanelClose()
    }

    const { historyPush, locator } = this.props
    historyPush(getAppPath({ dao: locator.dao, instanceId, params }))
  }
  handleAppIFrameRef = appIFrame => {
    this.appIFrame = appIFrame
  }
  handleAppIFrameLoad = event => {
    const {
      apps,
      wrapper,
      locator: { instanceId },
    } = this.props
    if (
      !wrapper ||
      !apps.find(app => addressesEqual(app.proxyAddress, instanceId))
    ) {
      console.error('The app cannot be connected to aragon.js')
      return
    }

    wrapper.connectAppIFrame(event.target, instanceId)
    this.appIFrame.sendMessage({
      from: 'wrapper',
      name: 'ready',
      value: true,
    })
  }
  handleAppIFrameMessage = ({ data: { name, value } }) => {
    if (name === 'menuPanel') {
      this.setState({ menuPanelOpened: value })
    }
  }
  handleMenuPanelClose = () => {
    this.setState({ menuPanelOpened: false })
  }
  handleNotificationsClearAll = () => {
    const { wrapper } = this.props
    wrapper && wrapper.clearNotifications()
  }
  handleNotificationNavigation = ({ context, app: instanceId }) => {
    if (this.isAppInstalled(instanceId)) {
      this.openApp(instanceId)
    }
  }
  // params need to be a string
  handleParamsRequest = params => {
    this.openApp(this.props.locator.instanceId, params)
  }

  isAppInstalled(instanceId) {
    const { apps } = this.props
    return (
      staticApps.has(instanceId) &&
      !!apps.find(app => addressesEqual(app.proxyAddress, instanceId))
    )
  }

  render() {
    const {
      account,
      apps,
      appsStatus,
      banner,
      connected,
      daoAddress,
      locator,
      onRequestAppsReload,
      onRequestEnable,
      transactionBag,
      walletNetwork,
      walletProviderId,
      walletWeb3,
      wrapper,
    } = this.props

    return (
      <Main>
        <BannerWrapper>{banner}</BannerWrapper>
        <Container>
          <MenuPanel
            apps={apps.filter(app => app.hasWebApp)}
            appsStatus={appsStatus}
            activeInstanceId={locator.instanceId}
            connected={connected}
            daoAddress={daoAddress}
            menuPanelOpened={this.state.menuPanelOpened}
            notificationsObservable={wrapper && wrapper.notifications}
            onOpenApp={this.openApp}
            onClearAllNotifications={this.handleNotificationsClearAll}
            onCloseMenuPanel={this.handleMenuPanelClose}
            onOpenNotification={this.handleNotificationNavigation}
            onRequestAppsReload={onRequestAppsReload}
          />
          <AppScreen>
            {this.renderApp(locator.instanceId, locator.params)}
          </AppScreen>
        </Container>
        <SignerPanel
          account={account}
          apps={apps}
          locator={locator}
          onRequestEnable={onRequestEnable}
          transactionBag={transactionBag}
          walletNetwork={walletNetwork}
          walletProviderId={walletProviderId}
          walletWeb3={walletWeb3}
        />
      </Main>
    )
  }
  renderApp(instanceId, params) {
    const {
      account,
      apps,
      appsStatus,
      connected,
      daoAddress,
      locator,
      permissionsLoading,
      walletNetwork,
      walletWeb3,
      wrapper,
    } = this.props

    const appsLoading = appsStatus === APPS_STATUS_LOADING

    if (instanceId === 'home') {
      return (
        <Home
          connected={connected}
          appsLoading={appsLoading}
          onMessage={this.handleAppIFrameMessage}
          onOpenApp={this.openApp}
          locator={locator}
          apps={apps}
        />
      )
    }

    if (instanceId === 'permissions') {
      return (
        <Permissions
          apps={apps}
          appsLoading={appsLoading}
          permissionsLoading={permissionsLoading}
          params={params}
          onMessage={this.handleAppIFrameMessage}
          onParamsRequest={this.handleParamsRequest}
        />
      )
    }

    if (instanceId === 'apps') {
      return <Apps onMessage={this.handleAppIFrameMessage} />
    }

    if (instanceId === 'settings') {
      return (
        <Settings
          account={account}
          apps={apps}
          daoAddress={daoAddress}
          onMessage={this.handleAppIFrameMessage}
          onOpenApp={this.openApp}
          walletNetwork={walletNetwork}
          walletWeb3={walletWeb3}
        />
      )
    }

    if (!wrapper || appsLoading) {
      return <LoadingApps />
    }

    const app = apps.find(app => addressesEqual(app.proxyAddress, instanceId))

    return app ? (
      <AppIFrame
        app={app}
        ref={this.handleAppIFrameRef}
        onLoad={this.handleAppIFrameLoad}
        onMessage={this.handleAppIFrameMessage}
      />
    ) : (
      <App404 onNavigateBack={this.props.historyBack} />
    )
  }
}

const Main = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`

const BannerWrapper = styled.div`
  position: relative;
  z-index: 1;
  flex-shrink: 0;
`

const Container = styled.div`
  position: relative;
  display: flex;
  flex-grow: 1;
  min-height: 0;
`

const AppScreen = styled.div`
  position: relative;
  z-index: 1;
  flex-grow: 1;
  overflow: auto;
`

const LoadingAnimation = styled.img`
  display: block;
  margin-bottom: 32px;
`

const LoadingApps = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      flexDirection: 'column',
    }}
  >
    <LoadingAnimation src={ethereumLoadingAnimation} />
    Loading apps…
  </div>
)

export default Wrapper
