.. highlight:: js

Scroll View
===========

.. js:class:: QuiX.ui.ScrollView(params)

   Creates a new scroll view widget. Mainly targeted for touch enabled devices.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object.

      The ``sdir`` defines the scrolling direction. Use ``'v'`` for
      vertical only scrolling, ``'h'`` for horizontal only scrolling or ``'both'``
      for scrolling in both axes. Default value is ``'v'``.

      The ``ssbar`` boolean attribute defines if the scroll bars are visible
      or not.

   Example usage:

      Create a new scroll view widget::

        var w = new QuiX.ui.ScrollView({left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        sdir: 'v'});

      XML markup:

      .. code-block:: xml

         <scrollview left="0" top="0" width="100%" height="100%" sdir="v"></scrollview>

   .. TIP:: For the scroll view to scroll there should be at least one child widget
      that exceeds its boundaries. If inside the scroll view there is only
      one widget with its :js:attr:`~QuiX.ui.Widget.width` and :js:attr:`~QuiX.ui.Widget.height`
      set to ``'100%'`` no scrolling will ever occur.

Methods
-------

   .. js:function:: QuiX.ui.ScrollView.scrollTo(x, y)

      Causes the scroll view to scroll at the specified co-ordinates.

      :param number x: The horizontal scroll offset
      :param number y: The vertical scroll offset


   .. js:function:: QuiX.ui.ScrollView.getScrollOffset()

      :returns: An array in in the form of [x, y] that contains the
         current horizontal and vertical scroll offsets respectively.
