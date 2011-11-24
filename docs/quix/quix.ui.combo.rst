.. highlight:: js

Combo
=====

.. js:class:: QuiX.ui.Combo(params)

   Creates a new dropdown list (combo) widget.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object.

      The ``value`` attribute defines the combo's value.

      The ``editable`` attribute defines if the dropdown list allows custom
      values or not.

      The ``name`` attribute defines the combo's name when used inside QuiX forms.

   Example usage:

      Create a new dropdown list widget and populate it with one option::

        var w = new QuiX.ui.Combo({left: 0,
                                   top: 0,
                                   width: 120,
                                   height: 24,
                                   name: 'MyCombo'});
        w.addOption({caption: 'Option 1',
                     value: '1'});

      XML markup:

      .. code-block:: xml

         <combo left="0" top="0" width="120" height="24" name="MyCombo">
           <option caption="Option 1" value="1"/>
         </combo>

Attributes
----------

   .. js:attribute:: QuiX.ui.Combo.name

      Defines the combo's name when used inside a QuiX form.

   .. js:attribute:: QuiX.ui.Combo.options

      An array containing all the available option widgets of the combo.

Methods
-------

   .. js:function:: QuiX.ui.Combo.getValue()

      :returns: The value of the combo.


   .. js:function:: QuiX.ui.Combo.setValue(value)

      Sets the value of the combo.

      :param string value: If the combo is editable then any string
         sets the value accordingly.

         If not the value must be one of the available options' values.


   .. js:function:: QuiX.ui.Combo.focus()

      Sets the focus to the current combo.


   .. js:function:: QuiX.ui.Combo.blur()

      Removes the focus from the current combo.


   .. js:function:: QuiX.ui.Combo.getPrompt()

      Valid only for editable combos.
      Returns the prompt text appearing inside the field.


   .. js:function:: QuiX.ui.Combo.setPrompt()

      Valid only for editable combos.
      Sets the prompt text appearing inside the field.
      Usefull for creating labeless combos.


   .. js:function:: QuiX.ui.Combo.selectOption(option)

      Selects the provided option.

      :param QuiX.ui.Widget option: The option widget to select

      Example usage::

         // select the second option
         combo.selectOption(combo.options[1]);


   .. js:function:: QuiX.ui.Combo.reset()

      Resets the combo to its initial value.


   .. js:function:: QuiX.ui.Combo.clearOptions()

      Clears all combo's options.


   .. js:function:: QuiX.ui.Combo.addOption(params)

      Adds a new combo option.

      :param object params: The option's parameters

      Example usage::

         // select the second option
         combo.addOption({caption: 'New Option',
                          img: 'IMG_URL',
                          align: 'right',
                          selected: true,
                          value: 'new'});

Events
------

Custom Events
^^^^^^^^^^^^^

   onchange, onfocus, onblur
