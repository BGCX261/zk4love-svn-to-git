package cn.zkoss.zk4love.web.controller;

import org.zkoss.zk.ui.Component;
import org.zkoss.zk.ui.event.Event;
import org.zkoss.zk.ui.util.Clients;
import org.zkoss.zk.ui.util.GenericForwardComposer;

public class MouseClickController extends GenericForwardComposer {
	private static final long serialVersionUID = 2734553685458769226L;

	public void doAfterCompose(Component comp) throws Exception {
		super.doAfterCompose(comp);

	}
	public void onShowPointer(Event e){
		Clients.log("后台获取数据="+e.getData());
	}
}
