.. highlight:: js

Field
=====

.. js:class:: QuiX.ui.Field(params)

   Creates a new field widget.
   Supported types include text input fields, text areas, checkboxes,
   radio buttons and password input fields.

   **Derives from:** :js:class:`~QuiX.ui.Widget`

   :param object params: The parameters object. 
      The field type is determined by the ``type`` attribute.

         * ``'text'`` creates a text input field (default)
         * ``'textarea'`` created a multiline text input
         * ``'password'`` creates a password input field
         * ``'checkbox'`` creates a checkbox
         * ``'radio'`` creates a radio button

      The ``maxlength`` attribute defines the field's maximum number of
      allowed characters.

      The ``tabindex`` attribute defines the field's tab order.

      The ``value`` attribute defines the field's value.

      The ``name`` attribute defines the field's name when used inside QuiX forms.


   Example usage:

      Create checked checkbox field::

        var w = new QuiX.ui.Field({left: 0,
                                   top: 0,
                                   width: 120,
                                   height: 24,
                                   type: 'checkbox',
                                   value: true,
                                   caption: 'This is a checkbox',
                                   name: 'MyField'});

      XML markup:

      .. code-block:: xml

         <field left="0" top="0" width="120" height="24" caption="This is a checkbox"
           type="checkbox" value="true" name="MyField"></field>

   .. TIP:: In order to create a radio group, two conditions must be met. The
      radio buttons must share the same ID and each one of them must
      have a distinct string value.
            
      Example markup:

      .. code-block:: xml

         <vbox width="100%" height="50">
           <field id="radio_group" height="24" type="radio" value="1"
             caption="Radio 1" name="radio_group"></field>
           <field id="radio_group" height="24" type="radio" value="2"
             caption="Radio 2" name="radio_group"></field>
         </vbox>

Attributes
----------

.. js:attribute:: QuiX.ui.Field.name

   Defines the field's name when used inside a QuiX form.

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Field.align

   String attribute specifying the fields's text alignment.
   Valid values are ``left``, ``right`` and ``auto`` which translates
   to left aligned text for ltr layouts and right aligned text for rtl
   layouts.
   Default value is ``auto``.

   Example usage::

      field.align = 'right';
      field.redraw(true);

--------------------------------------------------------------------------------

.. js:attribute:: QuiX.ui.Field.textPadding

   Defines the field's horizontal padding.
   Valid only for text inputs, text areas and password fields.

   Example usage::

      field.textPadding = '8px';
      field.redraw(true);


Methods
-------

.. js:function:: QuiX.ui.Field.getValue()

   :returns: The value of the field. For radio groups getting the value
      of every radio in the group returns the same value.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.setValue(value)

   Sets the value of the field.

   :param value: In case of text, textarea and password fields value should
      be a string. In case of checkboxes value should be a boolean.
      In case of radio buttons value should be a one of the distinct string
      values as defined in the radio group.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.getCaption()

   Valid only for radio buttons and check boxes.

   :returns: The text of the field's caption otherwise
      if not a radio button or a check box ``null`` is returned.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.setCaption(caption)

   Valid only for radio buttons and check boxes. Sets the text of the field's
   caption.

   :param string caption: The text to set

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.focus()

   Sets the focus to the current field.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.blur()

   Removes the focus from the current field.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.getPrompt()

   Valid only for text input, text areas and password fields.
   Returns the prompt text appearing inside the field.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.setPrompt()

   Valid only for text input, text areas and password fields.
   Sets the prompt text appearing inside the field.
   Usefull for creating labeless fields.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.setReadOnly(readonly)

   Set the field to be read-only.

   :param bool readonly: If ``true`` then the field becomes read-only. If
     ``false`` then the field is editable.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.getTextOpacity()

   :returns: The text opacity expressed as a float number between 0 and 1.

--------------------------------------------------------------------------------

.. js:function:: QuiX.ui.Field.setTextOpacity(op)

   Adjusts the text opacity.

   :param number op: The text opacity expressed as a float number between 0 and 1.

Events
------

Custom Events
^^^^^^^^^^^^^

onchange, onfocus, onblur
